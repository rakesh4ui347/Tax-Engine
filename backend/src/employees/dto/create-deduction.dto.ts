import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class CreateDeductionDto {
  @ApiProperty({
    example: '401K',
    description: 'Deduction code: 401K, HEALTH, DENTAL, VISION, HSA, FSA, GARNISHMENT, etc.',
  })
  @IsString()
  code: string;

  @ApiProperty({ example: '401(k) Employee Contribution' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 150.00, description: 'Fixed dollar amount per period' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 0.06, description: 'Percentage of gross pay (e.g., 0.06 = 6%)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({ example: true, description: 'Pre-tax reduces taxable wages' })
  @IsBoolean()
  @IsOptional()
  preTax?: boolean;

  @ApiPropertyOptional({ example: 1.0, description: 'Employee portion (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  employeeShare?: number;

  @ApiPropertyOptional({ example: 0.5, description: 'Employer match portion (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  employerShare?: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
