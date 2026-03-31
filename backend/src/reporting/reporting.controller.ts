import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'companies/:companyId/reports', version: '1' })
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('payroll-register/:runId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.APPROVER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Get payroll register for a run' })
  @ApiResponse({ status: 200, description: 'Payroll register data' })
  getPayrollRegister(
    @Param('companyId') companyId: string,
    @Param('runId') runId: string,
  ) {
    return this.reportingService.getPayrollRegister(companyId, runId);
  }

  @Get('payroll-register/:runId/csv')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Export payroll register as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportPayrollCsv(
    @Param('companyId') companyId: string,
    @Param('runId') runId: string,
    @Res() res: Response,
  ) {
    const csv = await this.reportingService.exportPayrollCsv(companyId, runId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-register-${runId}.csv"`,
    );
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('tax-liabilities')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.APPROVER)
  @ApiOperation({ summary: 'Get tax liability summary by jurisdiction' })
  @ApiQuery({ name: 'year', type: Number, required: true })
  @ApiQuery({ name: 'quarter', type: Number, required: false, description: '1-4' })
  getTaxLiabilitySummary(
    @Param('companyId') companyId: string,
    @Query('year') year: number,
    @Query('quarter') quarter?: number,
  ) {
    return this.reportingService.getTaxLiabilitySummary(
      companyId,
      Number(year),
      quarter ? Number(quarter) : undefined,
    );
  }

  @Get('employee-ytd/:employeeId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.APPROVER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get employee YTD earnings and tax summary' })
  @ApiQuery({ name: 'year', type: Number, required: true })
  getEmployeeYTD(
    @Param('companyId') companyId: string,
    @Param('employeeId') employeeId: string,
    @Query('year') year: number,
  ) {
    return this.reportingService.getEmployeeYTD(companyId, employeeId, Number(year));
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.APPROVER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Get company payroll summary for a year' })
  @ApiQuery({ name: 'year', type: Number, required: true })
  getCompanySummary(@Param('companyId') companyId: string, @Query('year') year: number) {
    return this.reportingService.getCompanySummary(companyId, Number(year));
  }
}
