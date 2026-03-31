import {
  IsString, IsArray, IsOptional, IsDateString,
  ArrayNotEmpty, IsIn,
} from 'class-validator';

export class CreatePartnerKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes: string[];

  @IsOptional()
  @IsIn(['live', 'test'])
  environment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
