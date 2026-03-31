import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportingService } from './reporting.service';

/**
 * Top-level reporting endpoints — companyId comes from query param.
 * These back the frontend /reporting/* pages which don't have companyId in the path.
 */
@UseGuards(JwtAuthGuard)
@Controller({ path: 'reporting', version: '1' })
export class ReportingPublicController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('payroll-register')
  getPayrollRegister(
    @Query('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year') year?: string,
  ) {
    return this.reportingService.getPayrollRegisterByFilters(
      companyId,
      startDate,
      endDate,
      year ? Number(year) : undefined,
    );
  }

  @Get('tax-liability')
  getTaxLiability(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
    @Query('quarter') quarter?: string,
  ) {
    return this.reportingService.getTaxLiabilitySummaryFormatted(
      companyId,
      Number(year),
      quarter ? Number(quarter) : undefined,
    );
  }

  @Get('ytd')
  getYtd(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
  ) {
    return this.reportingService.getAllEmployeesYTD(companyId, Number(year));
  }

  @Get('tax-filings')
  getTaxFilings(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
    @Query('quarter') quarter?: string,
  ) {
    return this.reportingService.getTaxFilings(
      companyId,
      Number(year),
      quarter ? Number(quarter) : undefined,
    );
  }

  @Patch('tax-filings/:id/paid')
  markLiabilityAsPaid(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.reportingService.markLiabilityAsPaid(id, companyId);
  }
}
