import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TaxEngineService } from './tax-engine.service';
import { ReciprocityService } from './reciprocity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('tax-engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tax-engine', version: '1' })
export class TaxEngineController {
  constructor(
    private readonly taxEngineService: TaxEngineService,
    private readonly reciprocityService: ReciprocityService,
  ) {}

  @Post('preview')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Preview tax calculation for an employee' })
  @ApiResponse({ status: 200, description: 'Tax breakdown returned' })
  previewTax(
    @Body('employeeId') employeeId: string,
    @Body('companyId') companyId: string,
    @Body('grossPay') grossPay: number,
  ) {
    return this.taxEngineService.previewTax(employeeId, companyId, grossPay);
  }

  @Get('reciprocity/:residentState/:workState')
  @ApiOperation({ summary: 'Check if reciprocity exists between two states' })
  async checkReciprocity(
    @Param('residentState') residentState: string,
    @Param('workState') workState: string,
  ) {
    const hasReciprocity = await this.reciprocityService.hasReciprocity(
      residentState.toUpperCase(),
      workState.toUpperCase(),
    );
    return { residentState, workState, hasReciprocity };
  }

  @Get('reciprocity/:state')
  @ApiOperation({ summary: 'Get all reciprocity agreements for a state' })
  async getStateReciprocity(@Param('state') state: string) {
    return this.reciprocityService.getAgreementsForState(state.toUpperCase());
  }
}
