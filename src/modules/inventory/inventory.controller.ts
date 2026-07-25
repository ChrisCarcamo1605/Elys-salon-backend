import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { ListEntriesDto } from './dto/list-entries.dto';
import { canSeeCost, stripCost } from '../../common/utils/cost-visibility';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Post('entries')
  @RequirePermission('inventory.create')
  async createEntry(@Body() dto: CreateEntryDto, @CurrentUser() user: AuthUser) {
    const visible = canSeeCost(user);
    const entry = await this.service.createEntry(dto, user.id, visible);
    return stripCost(entry, visible);
  }

  @Post('adjustments')
  @RequirePermission('inventory.adjust')
  createAdjustment(
    @Body() dto: CreateAdjustmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createAdjustment(dto, user.id);
  }

  // El listado hace leftJoin del producto, así que arrastra `product.cost`
  // además de unitCost/totalCost de cada entrada: hay que filtrarlo todo.
  @Get('entries')
  @RequirePermission('inventory.read')
  async findAll(@Query() query: ListEntriesDto, @CurrentUser() user: AuthUser) {
    const result = await this.service.findAll(query);
    return stripCost(result, canSeeCost(user));
  }
}
