import { Body, Controller, Get, Patch, Post, Put, Param, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { SnoozeAlertDto } from './dto/snooze-alert.dto';
import { StockConfigDto } from './dto/stock-config.dto';
import { UpdateSlowMoverDto } from './dto/update-slow-mover.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  @RequirePermission('analytics.read')
  findAll() {
    return this.service.findAll();
  }

  @Post(':id/resolve')
  @RequirePermission('analytics.read')
  resolve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto?: ResolveAlertDto) {
    return this.service.resolve(id, user.id, dto);
  }

  @Post(':id/snooze')
  @RequirePermission('analytics.read')
  snooze(@Param('id') id: string, @Body() dto: SnoozeAlertDto) {
    return this.service.snooze(id, dto);
  }

  @Post(':id/reopen')
  @RequirePermission('analytics.read')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }

  @Put('stock-config')
  @RequirePermission('inventory.adjust')
  updateStockConfig(@Body() dto: StockConfigDto) {
    return this.service.updateStockConfig(dto);
  }

  @Patch('slow-movers/:id')
  @RequirePermission('offers.write')
  updateSlowMover(@Param('id') id: string, @Body() dto: UpdateSlowMoverDto) {
    return this.service.updateSlowMover(id, dto);
  }
}