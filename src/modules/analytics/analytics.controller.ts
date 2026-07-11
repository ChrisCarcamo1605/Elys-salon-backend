import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { Role } from '../../common/enums';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  /** Admin puede pedir cualquier sucursal (o ninguna = general); no-admin siempre forzado a la suya. */
  private resolveBranchId(
    user: AuthUser,
    requested?: string,
  ): string | undefined {
    if (user.role === Role.ADMIN) return requested || undefined;
    return user.branchId ?? undefined;
  }

  @Get('sales-by-day')
  @RequirePermission('analytics.read')
  salesByDay(
    @Query('range') range: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getSalesByDay(
      range,
      from,
      to,
      this.resolveBranchId(user, branchId),
    );
  }

  @Get('category-revenue')
  @RequirePermission('analytics.read')
  categoryRevenue(
    @Query('range') range: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getCategoryRevenue(
      range,
      from,
      to,
      this.resolveBranchId(user, branchId),
    );
  }

  @Get('top-employees')
  @RequirePermission('analytics.read')
  topEmployees(
    @Query('range') range: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getTopEmployees(
      range,
      from,
      to,
      this.resolveBranchId(user, branchId),
    );
  }

  @Get('hourly-traffic')
  @RequirePermission('analytics.read')
  hourlyTraffic(
    @Query('date') date: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getHourlyTraffic(
      date,
      this.resolveBranchId(user, branchId),
    );
  }

  @Get('kpis')
  @RequirePermission('analytics.read')
  kpis(
    @Query('range') range: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getKpis(
      range,
      from,
      to,
      this.resolveBranchId(user, branchId),
    );
  }
}
