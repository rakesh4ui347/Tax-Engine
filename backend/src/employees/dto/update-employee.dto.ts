import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EmployeeType, PayFrequency } from '@prisma/client';

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  terminationDate?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  zip?: string;

  @ApiPropertyOptional({ enum: EmployeeType })
  @IsEnum(EmployeeType)
  @IsOptional()
  employeeType?: EmployeeType;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  annualSalary?: number;

  @ApiPropertyOptional({ enum: PayFrequency })
  @IsEnum(PayFrequency)
  @IsOptional()
  payFrequency?: PayFrequency;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultHours?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  overtimeEligible?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  residentState?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  workState?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
