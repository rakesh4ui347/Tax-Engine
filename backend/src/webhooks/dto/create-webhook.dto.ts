import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { WebhookEvent } from '@prisma/client';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://app.example.com/webhooks/payroll' })
  @IsUrl()
  url: string;

  @ApiProperty({
    isArray: true,
    enum: WebhookEvent,
    example: [WebhookEvent.PAYROLL_RUN_COMPLETED, WebhookEvent.PAYROLL_RUN_FAILED],
  })
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events: WebhookEvent[];

  @ApiPropertyOptional({
    example: 'my-webhook-secret',
    description: 'Secret for HMAC-SHA256 signature. Auto-generated if not provided.',
  })
  @IsString()
  @IsOptional()
  secret?: string;
}
