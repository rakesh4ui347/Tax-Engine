import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';

/**
 * Must be used AFTER PartnerApiKeyGuard (which attaches req.partnerKey).
 * Checks that the key's scopes include all required scopes for this route.
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const partnerKey = request.partnerKey as { scopes: string[] } | undefined;
    if (!partnerKey) return false;

    const missing = required.filter((s) => !partnerKey.scopes.includes(s) && !partnerKey.scopes.includes('admin'));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Insufficient scopes. Required: [${required.join(', ')}]. Key has: [${partnerKey.scopes.join(', ')}]`,
      );
    }
    return true;
  }
}
