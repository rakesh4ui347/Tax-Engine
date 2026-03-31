import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  Matches,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  name: string;

  @ApiProperty({ example: '12-3456789', description: 'Employer Identification Number' })
  @IsString()
  @Matches(/^\d{2}-\d{7}$/, { message: 'EIN must be in format XX-XXXXXXX' })
  ein: string;

  @ApiProperty({ example: '100 Main Street' })
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Suite 200' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  state: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  zip: string;

  @ApiPropertyOptional({ example: '212-555-0100' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'info@acme.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 1, description: 'Fiscal year start month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  fiscalYearStart?: number;
}
