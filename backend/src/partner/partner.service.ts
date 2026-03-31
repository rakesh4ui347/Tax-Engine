import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerKeyDto } from './dto/create-partner-key.dto';

const KEY_PREFIX_LENGTH = 8;

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Key Management ───────────────────────────────────────────────────────

  async createKey(organizationId: string, dto: CreatePartnerKeyDto) {
    const raw = `pke_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = hashKey(raw);
    const keyPrefix = raw.slice(0, KEY_PREFIX_LENGTH + 4); // 'pke_XXXXXXXX'

    const key = await this.prisma.partnerApiKey.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        keyHash,
        keyPrefix,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        ...(dto.environment ? { environment: dto.environment } : {}),
        ...(dto.allowedIps ? { allowedIps: dto.allowedIps } : {}),
      } as any,
    });

    this.logger.log(`Created partner API key ${key.id} for org ${organizationId}`);

    return {
      id: key.id,
      name: key.name,
      keyPrefix,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      // rawKey shown ONCE — never stored in plaintext
      rawKey: raw,
    };
  }

  async listKeys(organizationId: string) {
    return this.prisma.partnerApiKey.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeKey(id: string, organizationId: string) {
    const key = await this.prisma.partnerApiKey.findFirst({
      where: { id, organizationId },
    });
    if (!key) throw new NotFoundException(`Partner key ${id} not found`);

    return this.prisma.partnerApiKey.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
  }

  async rotateKey(id: string, organizationId: string) {
    const existing = await this.prisma.partnerApiKey.findFirst({
      where: { id, organizationId, isActive: true },
    });
    if (!existing) throw new NotFoundException(`Partner key ${id} not found`);

    // Generate new raw key
    const raw = `pke_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = hashKey(raw);
    const keyPrefix = raw.slice(0, KEY_PREFIX_LENGTH + 4);

    // Atomically revoke old and create new in a transaction
    const [, newKey] = await this.prisma.$transaction([
      this.prisma.partnerApiKey.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.partnerApiKey.create({
        data: {
          organizationId,
          name: existing.name,
          description: existing.description,
          keyHash,
          keyPrefix,
          scopes: existing.scopes,
          expiresAt: existing.expiresAt,
          ...(existing as any).environment !== undefined
            ? { environment: (existing as any).environment }
            : {},
          ...(existing as any).allowedIps !== undefined
            ? { allowedIps: (existing as any).allowedIps }
            : {},
        },
      }),
    ]);

    this.logger.log(`Rotated partner API key ${id} → ${newKey.id} for org ${organizationId}`);

    return {
      id: newKey.id,
      name: newKey.name,
      keyPrefix,
      scopes: newKey.scopes,
      expiresAt: newKey.expiresAt,
      createdAt: newKey.createdAt,
      rawKey: raw,
      previousKeyId: id,
    };
  }

  async getKeyUsage(id: string, organizationId: string) {
    const key = await this.prisma.partnerApiKey.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        requestCount: true,
      } as any,
    });
    if (!key) throw new NotFoundException(`Partner key ${id} not found`);
    return key;
  }

  // ─── Validation (called by guard) ─────────────────────────────────────────

  async validateKey(raw: string): Promise<{
    organizationId: string;
    scopes: string[];
    keyId: string;
    environment: string;
    allowedIps: string[];
  } | null> {
    const keyHash = hashKey(raw);

    const key = await this.prisma.partnerApiKey.findUnique({
      where: { keyHash },
    });

    if (!key || !key.isActive) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;

    // Increment requestCount and update lastUsedAt async (don't block request)
    this.prisma.partnerApiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date(), requestCount: { increment: 1 } } as any,
      })
      .catch((e) => this.logger.warn(`Failed to update key usage: ${e.message}`));

    return {
      organizationId: key.organizationId,
      scopes: key.scopes,
      keyId: key.id,
      environment: (key as any).environment ?? 'live',
      allowedIps: (key as any).allowedIps ?? [],
    };
  }

  // ─── Idempotency ──────────────────────────────────────────────────────────

  /**
   * Check if an idempotency key has already been used for a given operation.
   * Returns the cached response body if found, or null if this is a new request.
   * The caller is responsible for storing the response after a successful operation.
   */
  async checkIdempotency(
    organizationId: string,
    idempotencyKey: string,
    operation: string,
  ): Promise<{ cached: true; body: any } | { cached: false }> {
    // We store idempotency results in the AuditLog with action='IDEMPOTENCY'
    const existing = await this.prisma.auditLog.findFirst({
      where: {
        action: 'IDEMPOTENCY',
        resource: operation,
        resourceId: idempotencyKey,
        // Idempotency keys expire after 24 hours
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.newValue) {
      return { cached: true, body: existing.newValue };
    }

    return { cached: false };
  }

  async storeIdempotencyResult(
    organizationId: string,
    idempotencyKey: string,
    operation: string,
    responseBody: any,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: 'IDEMPOTENCY',
        resource: operation,
        resourceId: idempotencyKey,
        newValue: responseBody,
      },
    });
  }
}
