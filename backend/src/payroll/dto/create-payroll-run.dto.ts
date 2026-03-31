import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PayFrequency } from '@prisma/client';

export class CreatePayrollRunDto {
  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2024-01-14' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ example: '2024-01-19' })
  @IsDateString()
  payDate: string;

  @ApiProperty({ enum: PayFrequency, example: PayFrequency.BIWEEKLY })
  @IsEnum(PayFrequency)
  payFrequency: PayFrequency;

  @ApiPropertyOptional({
    example: 'run-uuid-for-idempotency',
    description: 'Unique key to prevent duplicate runs',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
