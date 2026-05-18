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

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Post('entries')
  @RequirePermission('inventory.create')
  createEntry(@Body() dto: CreateEntryDto, @CurrentUser() user: AuthUser) {
    return this.service.createEntry(dto, user.id);
  }

  @Post('adjustments')
  @RequirePermission('inventory.adjust')
  createAdjustment(
    @Body() dto: CreateAdjustmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createAdjustment(dto, user.id);
  }

  @Get('entries')
  @RequirePermission('inventory.read')
  findAll(@Query() query: ListEntriesDto) {
    return this.service.findAll(query);
  }
}
