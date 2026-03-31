import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovePayrollDto {
  @ApiPropertyOptional({ example: 'Approved after final review.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
