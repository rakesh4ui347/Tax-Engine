import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { PartnerService } from './partner.service';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? '';
}

/**
 * Guard for partner (machine-to-machine) API routes.
 * 1. Reads X-API-Key header and validates against hashed DB record.
 * 2. Checks IP allowlist (if configured on the key).
 * 3. Attaches { organizationId, scopes, keyId, environment } to req.partnerKey.
 */
@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private readonly partnerService: PartnerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers['x-api-key'] as string;

    if (!rawKey) {
      throw new UnauthorizedException('X-API-Key header is required');
    }

    const partnerKey = await this.partnerService.validateKey(rawKey);
    if (!partnerKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // IP allowlist check
    if (partnerKey.allowedIps.length > 0) {
      const clientIp = getClientIp(request);
      if (!partnerKey.allowedIps.includes(clientIp)) {
        throw new ForbiddenException(
          `IP ${clientIp} is not in the allowlist for this API key`,
        );
      }
    }

    (request as any).partnerKey = partnerKey;
    return true;
  }
}
