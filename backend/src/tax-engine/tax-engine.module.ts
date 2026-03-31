import { Module } from '@nestjs/common';
import { TaxEngineService } from './tax-engine.service';
import { ReciprocityService } from './reciprocity.service';
import { TaxEngineController } from './tax-engine.controller';

@Module({
  providers: [TaxEngineService, ReciprocityService],
  controllers: [TaxEngineController],
  exports: [TaxEngineService, ReciprocityService],
})
export class TaxEngineModule {}
