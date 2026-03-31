import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateEmployeeDto {
  @ApiProperty({ example: 'E001' })
  @IsString()
  employeeNumber: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: 'Marie' })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({ example: '123-45-6789', description: 'SSN will be encrypted at rest' })
  @IsString()
  ssn: string;

  @ApiProperty({ example: '1985-06-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: '2020-01-06' })
  @IsDateString()
  hireDate: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  terminationDate?: string;

  @ApiProperty({ example: 'jane.smith@company.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '512-555-0101' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '123 Oak Ave' })
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ example: 'Austin' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'TX' })
  @IsString()
  state: string;

  @ApiProperty({ example: '78703' })
  @IsString()
  zip: string;

  @ApiPropertyOptional({ enum: EmployeeType, default: EmployeeType.FTE })
  @IsEnum(EmployeeType)
  @IsOptional()
  employeeType?: EmployeeType;

  @ApiPropertyOptional({ example: 85000, description: 'Annual salary for FTE employees' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  annualSalary?: number;

  @ApiPropertyOptional({ enum: PayFrequency })
  @IsEnum(PayFrequency)
  @IsOptional()
  payFrequency?: PayFrequency;

  @ApiPropertyOptional({ example: 28.5, description: 'Hourly rate for HOURLY employees' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 80, description: 'Default hours per pay period' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultHours?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  overtimeEligible?: boolean;

  @ApiProperty({ example: 'TX', description: 'State where employee resides' })
  @IsString()
  residentState: string;

  @ApiProperty({ example: 'TX', description: 'State where employee works' })
  @IsString()
  workState: string;
}
