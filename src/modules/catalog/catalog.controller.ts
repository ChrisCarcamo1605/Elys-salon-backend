import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ItemType } from '../../common/enums';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get()
  findAll(
    @Query('type') type?: ItemType,
    @Query('categoryId') categoryId?: string,
    @Query('active') active?: string,
  ) {
    if (!type && !categoryId && active === undefined) {
      return this.service.getCatalog();
    }
    return this.service.findAll(type, categoryId, active === 'true' ? true : active === 'false' ? false : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('items')
  @RequirePermission('products.write')
  create(@Body() dto: CreateCatalogItemDto) {
    return this.service.create(dto);
  }

  @Patch('items/:id')
  @RequirePermission('products.write')
  update(@Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.service.update(id, dto);
  }

  @Delete('items/:id')
  @RequirePermission('products.write')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}