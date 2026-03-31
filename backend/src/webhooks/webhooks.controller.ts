import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'companies/:companyId/webhooks', version: '1' })
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Register a new webhook endpoint' })
  @ApiParam({ name: 'companyId', type: 'string' })
  create(@Param('companyId') companyId: string, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks for a company' })
  findAll(@Param('companyId') companyId: string) {
    return this.webhooksService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook details with recent deliveries' })
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.webhooksService.findOne(id, companyId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Update webhook' })
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWebhookDto>,
  ) {
    return this.webhooksService.update(id, companyId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate webhook' })
  deactivate(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.webhooksService.deactivate(id, companyId);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery history for a webhook' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getDeliveries(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.webhooksService.getDeliveries(id, companyId, limit ? Number(limit) : 20);
  }

  @Post('deliveries/:deliveryId/retry')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Manually retry a failed webhook delivery' })
  @HttpCode(HttpStatus.OK)
  retryDelivery(
    @Param('companyId') companyId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.webhooksService.retryDelivery(deliveryId, companyId);
  }
}
