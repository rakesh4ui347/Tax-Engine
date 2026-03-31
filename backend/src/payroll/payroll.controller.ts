import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PayrollService } from './payroll.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { ApprovePayrollDto } from './dto/approve-payroll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'companies/:companyId/payroll', version: '1' })
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('runs')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new payroll run (DRAFT)' })
  @ApiParam({ name: 'companyId', type: 'string' })
  @ApiResponse({ status: 201, description: 'Payroll run created in DRAFT status' })
  createRun(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePayrollRunDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.createRun(companyId, dto, user.id);
  }

  @Get('runs')
  @ApiOperation({ summary: 'List payroll runs for company' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'periodStart', required: false })
  @ApiQuery({ name: 'periodEnd', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  listRuns(
    @Param('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.payrollService.listRuns(companyId, {
      status,
      periodStart,
      periodEnd,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('runs/:runId')
  @ApiOperation({ summary: 'Get payroll run details' })
  getRunById(@Param('companyId') companyId: string, @Param('runId') runId: string) {
    return this.payrollService.getRunById(runId, companyId);
  }

  @Post('runs/:runId/calculate')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Calculate payroll (compute taxes, deductions, net pay)' })
  @ApiResponse({ status: 200, description: 'Payroll calculated; run status -> PENDING_APPROVAL' })
  @HttpCode(HttpStatus.OK)
  calculateRun(@Param('runId') runId: string) {
    return this.payrollService.calculateRun(runId);
  }

  @Post('runs/:runId/approve')
  @Roles(UserRole.APPROVER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve payroll run' })
  @ApiResponse({ status: 200, description: 'Payroll run approved; status -> APPROVED' })
  @HttpCode(HttpStatus.OK)
  approveRun(
    @Param('runId') runId: string,
    @Body() dto: ApprovePayrollDto,
    @CurrentUser() user: any,
  ) {
    return this.payrollService.approveRun(runId, user.id, dto);
  }

  @Post('runs/:runId/process')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Process (submit for disbursement) approved payroll run' })
  @ApiResponse({ status: 200, description: 'Payroll run completed; status -> COMPLETED' })
  @HttpCode(HttpStatus.OK)
  processRun(@Param('runId') runId: string, @CurrentUser() user: any) {
    return this.payrollService.processRun(runId, user.id);
  }

  @Patch('runs/:runId/void')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Void a payroll run' })
  @ApiResponse({ status: 200, description: 'Payroll run voided' })
  voidRun(@Param('runId') runId: string, @CurrentUser() user: any) {
    return this.payrollService.voidRun(runId, user.id);
  }

  @Get('runs/:runId/pay-stubs')
  @ApiOperation({ summary: 'Get all pay stubs for a run' })
  getPayStubs(@Param('companyId') companyId: string, @Param('runId') runId: string) {
    return this.payrollService.getPayStubsForRun(runId, companyId);
  }
}
