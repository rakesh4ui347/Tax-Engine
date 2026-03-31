import { Module } from '@nestjs/common';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';
import { PartnerApiKeyGuard } from './partner-api-key.guard';
import { ScopesGuard } from './guards/scopes.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PartnerController],
  providers: [PartnerService, PartnerApiKeyGuard, ScopesGuard],
  exports: [PartnerService, PartnerApiKeyGuard, ScopesGuard],
})
export class PartnerModule {}
