import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  Matches,
} from 'class-validator';
import { PayFrequency } from '@prisma/client';

export class CreateCompanyDto {
  @ApiProperty({ example: 'org-uuid-here' })
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'Acme LLC' })
  @IsString()
  name: string;

  @ApiProperty({ example: '98-7654321' })
  @IsString()
  @Matches(/^\d{2}-\d{7}$/, { message: 'EIN must be in format XX-XXXXXXX' })
  ein: string;

  @ApiProperty({ example: '200 Business Blvd' })
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Floor 3' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ example: 'Austin' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'TX' })
  @IsString()
  state: string;

  @ApiProperty({ example: '78701' })
  @IsString()
  zip: string;

  @ApiPropertyOptional({ example: '512-555-0200' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'payroll@acme.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: PayFrequency, default: PayFrequency.BIWEEKLY })
  @IsEnum(PayFrequency)
  @IsOptional()
  payFrequency?: PayFrequency;

  @ApiPropertyOptional({ example: '2024-02-16' })
  @IsDateString()
  @IsOptional()
  nextPayDate?: string;
}
