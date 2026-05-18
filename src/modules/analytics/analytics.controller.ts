import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('sales-by-day')
  @RequirePermission('analytics.read')
  salesByDay(@Query('range') range?: string) {
    return this.service.getSalesByDay(range);
  }

  @Get('category-revenue')
  @RequirePermission('analytics.read')
  categoryRevenue(@Query('range') range?: string) {
    return this.service.getCategoryRevenue(range);
  }

  @Get('top-employees')
  @RequirePermission('analytics.read')
  topEmployees(@Query('range') range?: string) {
    return this.service.getTopEmployees(range);
  }

  @Get('hourly-traffic')
  @RequirePermission('analytics.read')
  hourlyTraffic(@Query('date') date?: string) {
    return this.service.getHourlyTraffic(date);
  }

  @Get('kpis')
  @RequirePermission('analytics.read')
  kpis(@Query('range') range?: string) {
    return this.service.getKpis(range);
  }
}