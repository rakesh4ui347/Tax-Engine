import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Get dashboard KPI metrics' })
  getKpi(@CurrentUser() user: any) {
    return this.dashboardService.getKpi(user);
  }

  @Get('payroll-chart')
  @ApiOperation({ summary: 'Get payroll chart data (last 6 runs)' })
  getPayrollChart(@CurrentUser() user: any) {
    return this.dashboardService.getPayrollChart(user);
  }
}
