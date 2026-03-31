import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { WebhookEvent } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [30000, 120000, 600000]; // 30s, 2m, 10m

  constructor(private prisma: PrismaService) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(companyId: string, dto: CreateWebhookDto) {
    const secret = dto.secret || crypto.randomBytes(32).toString('hex');

    return this.prisma.webhook.create({
      data: {
        companyId,
        url: dto.url,
        events: dto.events,
        secret,
      },
      select: {
        id: true,
        companyId: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        // Do NOT return the secret in response
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.webhook.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { deliveries: true } },
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, companyId },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!webhook) throw new NotFoundException(`Webhook ${id} not found`);
    return webhook;
  }

  async update(id: string, companyId: string, dto: Partial<CreateWebhookDto>) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, companyId } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} not found`);

    return this.prisma.webhook.update({
      where: { id },
      data: {
        url: dto.url,
        events: dto.events,
      },
    });
  }

  async deactivate(id: string, companyId: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, companyId } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} not found`);

    return this.prisma.webhook.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Dispatch ─────────────────────────────────────────────────────────────

  async dispatch(companyId: string, event: string, payload: any): Promise<void> {
    const webhookEvent = event as WebhookEvent;

    const webhooks = await this.prisma.webhook.findMany({
      where: {
        companyId,
        isActive: true,
        events: { has: webhookEvent },
      },
    });

    for (const webhook of webhooks) {
      const idempotencyKey = uuidv4();
      const fullPayload = {
        event,
        webhookId: webhook.id,
        idempotencyKey,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event: webhookEvent,
          payload: fullPayload as any,
          idempotencyKey,
          status: 'PENDING',
        },
      });

      // Fire async (don't await — let it run in background)
      this.sendWebhook(webhook.id, delivery.id, webhook.url, webhook.secret, fullPayload).catch(
        (err) => {
          this.logger.error(`Webhook delivery ${delivery.id} failed: ${err.message}`);
        },
      );
    }
  }

  private signPayload(payload: any, secret: string): string {
    const body = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  private async sendWebhook(
    webhookId: string,
    deliveryId: string,
    url: string,
    secret: string,
    payload: any,
    attempt = 1,
  ): Promise<void> {
    const body = JSON.stringify(payload);
    const signature = this.signPayload(payload, secret);

    try {
      const { statusCode, responseBody } = await this.httpPost(url, body, {
        'Content-Type': 'application/json',
        'X-Payroll-Signature': `sha256=${signature}`,
        'X-Delivery-Id': deliveryId,
        'X-Webhook-Attempt': String(attempt),
        'User-Agent': 'PayrollTaxEngine/1.0',
      });

      const succeeded = statusCode >= 200 && statusCode < 300;

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: succeeded ? 'DELIVERED' : 'FAILED',
          attempts: attempt,
          lastAttemptAt: new Date(),
          responseCode: statusCode,
          responseBody: responseBody.substring(0, 1000),
          nextRetryAt: !succeeded && attempt < this.MAX_RETRIES
            ? new Date(Date.now() + this.RETRY_DELAYS[attempt - 1])
            : null,
        },
      });

      if (!succeeded && attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[attempt - 1];
        this.logger.warn(
          `Webhook delivery ${deliveryId} failed (${statusCode}), retrying in ${delay}ms`,
        );
        await this.prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: { status: 'RETRYING' },
        });
        setTimeout(() => {
          this.sendWebhook(webhookId, deliveryId, url, secret, payload, attempt + 1);
        }, delay);
      }
    } catch (err) {
      const willRetry = attempt < this.MAX_RETRIES;
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: willRetry ? 'RETRYING' : 'FAILED',
          attempts: attempt,
          lastAttemptAt: new Date(),
          responseBody: err.message,
          nextRetryAt: willRetry
            ? new Date(Date.now() + this.RETRY_DELAYS[attempt - 1])
            : null,
        },
      });

      if (willRetry) {
        const delay = this.RETRY_DELAYS[attempt - 1];
        setTimeout(() => {
          this.sendWebhook(webhookId, deliveryId, url, secret, payload, attempt + 1);
        }, delay);
      }
    }
  }

  private httpPost(
    url: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<{ statusCode: number; responseBody: string }> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 5000,
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, responseBody: data });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout (5s)'));
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async getDeliveries(webhookId: string, companyId: string, limit = 20) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id: webhookId, companyId } });
    if (!webhook) throw new NotFoundException(`Webhook ${webhookId} not found`);

    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async retryDelivery(deliveryId: string, companyId: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) throw new NotFoundException(`Delivery ${deliveryId} not found`);
    if (delivery.webhook.companyId !== companyId) throw new NotFoundException(`Delivery not found`);

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', nextRetryAt: null },
    });

    this.sendWebhook(
      delivery.webhookId,
      deliveryId,
      delivery.webhook.url,
      delivery.webhook.secret,
      delivery.payload,
      delivery.attempts + 1,
    ).catch((err) => this.logger.error(`Manual retry failed: ${err.message}`));

    return { message: 'Retry initiated', deliveryId };
  }
}
