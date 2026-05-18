import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post()
  @RequirePermission('tickets.create')
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermission('tickets.read')
  findAll(@Query() query: ListSalesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission('tickets.read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/void')
  @RequirePermission('tickets.void')
  voidSale(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.voidSale(id, user.id);
  }
}