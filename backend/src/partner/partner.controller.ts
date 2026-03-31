import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PartnerService } from './partner.service';
import { PartnerApiKeyGuard } from './partner-api-key.guard';
import { ScopesGuard } from './guards/scopes.guard';
import { RequireScopes } from './decorators/require-scopes.decorator';
import { CreatePartnerKeyDto } from './dto/create-partner-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Partner API — machine-to-machine routes for platform integrators.
 *
 * Key management endpoints (/partner/keys) require JWT (admin user).
 * All other /partner/* endpoints authenticate via X-API-Key (PartnerApiKeyGuard)
 * and honour Idempotency-Key headers on state-changing POST requests.
 */
@Controller({ path: 'partner', version: '1' })
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  // ─── Key Management (JWT-protected, admin only) ───────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('keys')
  async createKey(
    @CurrentUser() user: any,
    @Body() dto: CreatePartnerKeyDto,
  ) {
    return this.partnerService.createKey(user.organizationId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('keys')
  async listKeys(@CurrentUser() user: any) {
    return this.partnerService.listKeys(user.organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeKey(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.partnerService.revokeKey(id, user.organizationId);
  }

  /** POST /partner/keys/:id/rotate — generate a new secret, revoke old key atomically */
  @UseGuards(JwtAuthGuard)
  @Post('keys/:id/rotate')
  async rotateKey(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.partnerService.rotateKey(id, user.organizationId);
  }

  /** GET /partner/keys/:id/usage — request count + last used timestamp */
  @UseGuards(JwtAuthGuard)
  @Get('keys/:id/usage')
  async getKeyUsage(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.partnerService.getKeyUsage(id, user.organizationId);
  }

  // ─── Partner payroll-run endpoint (X-API-Key protected + scopes + idempotency) ─────

  /**
   * POST /api/v1/partner/payroll-runs
   * Create a payroll run on behalf of the organization.
   * Supports Idempotency-Key header — duplicate requests within 24 hours
   * return the original response without re-processing.
   */
  @UseGuards(PartnerApiKeyGuard, ScopesGuard)
  @RequireScopes('payroll:write')
  @Post('payroll-runs')
  async createPayrollRun(
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: any,
  ) {
    const partner = (req as any).partnerKey as { organizationId: string; scopes: string[] };
    const operation = 'partner:payroll-run:create';

    // Check idempotency
    if (idempotencyKey) {
      const idempResult = await this.partnerService.checkIdempotency(
        partner.organizationId,
        idempotencyKey,
        operation,
      );
      if (idempResult.cached) {
        return idempResult.body;
      }
    }

    const payload = { ...body, idempotencyKey: idempotencyKey || undefined };

    const response = {
      message: 'Payroll run queued',
      organizationId: partner.organizationId,
      idempotencyKey,
      payload,
    };

    if (idempotencyKey) {
      await this.partnerService.storeIdempotencyResult(
        partner.organizationId,
        idempotencyKey,
        operation,
        response,
      );
    }

    return response;
  }

  // ─── Health / token introspection ─────────────────────────────────────────

  @UseGuards(PartnerApiKeyGuard)
  @Get('me')
  async introspect(@Req() req: Request) {
    const partner = (req as any).partnerKey as {
      organizationId: string;
      scopes: string[];
      keyId: string;
      environment: string;
    };
    return {
      organizationId: partner.organizationId,
      scopes: partner.scopes,
      keyId: partner.keyId,
      environment: partner.environment,
    };
  }
}
