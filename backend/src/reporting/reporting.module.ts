import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { ReportingPublicController } from './reporting-public.controller';

@Module({
  providers: [ReportingService],
  controllers: [ReportingController, ReportingPublicController],
  exports: [ReportingService],
})
export class ReportingModule {}
