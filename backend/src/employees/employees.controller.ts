import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateW4Dto } from './dto/create-w4.dto';
import { CreateDeductionDto } from './dto/create-deduction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'companies/:companyId/employees', version: '1' })
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create employee' })
  @ApiParam({ name: 'companyId', type: 'string' })
  create(@Param('companyId') companyId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List employees for a company' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(
    @Param('companyId') companyId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.employeesService.findAll(companyId, includeInactive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.employeesService.findOne(companyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update employee' })
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(companyId, id, dto);
  }

  @Get(':id/w4')
  @ApiOperation({ summary: 'Get W-4 profile for employee' })
  getW4(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.employeesService.getW4(companyId, id);
  }

  @Post(':id/w4')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create or update W-4 profile' })
  upsertW4(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateW4Dto,
  ) {
    return this.employeesService.upsertW4(companyId, id, dto);
  }

  @Put(':id/w4')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update W-4 profile (alias for POST)' })
  updateW4(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateW4Dto,
  ) {
    return this.employeesService.upsertW4(companyId, id, dto);
  }

  @Post(':id/deductions')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Add a deduction to employee' })
  addDeduction(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateDeductionDto,
  ) {
    return this.employeesService.addDeduction(companyId, id, dto);
  }

  @Patch('deductions/:deductionId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update a deduction' })
  updateDeduction(
    @Param('deductionId') deductionId: string,
    @Body() dto: Partial<CreateDeductionDto>,
  ) {
    return this.employeesService.updateDeduction(deductionId, dto);
  }

  @Delete('deductions/:deductionId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a deduction' })
  deleteDeduction(@Param('deductionId') deductionId: string) {
    return this.employeesService.deleteDeduction(deductionId);
  }

  @Get(':id/pay-stubs')
  @ApiOperation({ summary: 'Get pay stubs for employee' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPayStubs(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.employeesService.getPayStubs(companyId, id, limit ? Number(limit) : 10);
  }
}
