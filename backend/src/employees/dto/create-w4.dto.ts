import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FilingStatus } from '@prisma/client';

export class CreateW4Dto {
  @ApiProperty({ example: 2024 })
  @IsInt()
  taxYear: number;

  @ApiProperty({ enum: FilingStatus, example: FilingStatus.SINGLE })
  @IsEnum(FilingStatus)
  filingStatus: FilingStatus;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  multipleJobs?: boolean;

  @ApiPropertyOptional({
    example: 2000,
    description: 'Step 3 dependent credit amount (e.g., 2000 per qualifying child)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  claimDependents?: number;

  @ApiPropertyOptional({ example: 0, description: 'Step 4a: Other income not from jobs' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  otherIncome?: number;

  @ApiPropertyOptional({ example: 0, description: 'Step 4b: Deductions other than standard' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  deductionsAmount?: number;

  @ApiPropertyOptional({ example: 0, description: 'Step 4c: Extra withholding per period' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  additionalWithholding?: number;

  @ApiPropertyOptional({ example: false, description: 'Exempt from federal income tax' })
  @IsBoolean()
  @IsOptional()
  exemptFromFIT?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Exempt from FICA (rare)' })
  @IsBoolean()
  @IsOptional()
  exemptFromFICA?: boolean;

  @ApiPropertyOptional({ example: 'SINGLE', description: 'State-specific filing status' })
  @IsString()
  @IsOptional()
  stateFilingStatus?: string;

  @ApiPropertyOptional({ example: 1, description: 'State allowances (legacy states)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  stateAllowances?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stateAdditionalWH?: number;
}
