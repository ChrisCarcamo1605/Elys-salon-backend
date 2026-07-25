import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ItemType } from '../../common/enums';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { canSeeCost, stripCost } from '../../common/utils/cost-visibility';

@Controller('catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  // El catálogo lo lee todo el mundo (el POS lo necesita), pero el costo de
  // compra solo viaja hacia quien tiene 'products.cost.read'.
  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: ItemType,
    @Query('categoryId') categoryId?: string,
    @Query('active') active?: string,
  ) {
    const result =
      !type && !categoryId && active === undefined
        ? await this.service.getCatalog()
        : await this.service.findAll(
            type,
            categoryId,
            active === 'true' ? true : active === 'false' ? false : undefined,
          );
    return stripCost(result, canSeeCost(user));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const item = await this.service.findOne(id);
    return stripCost(item, canSeeCost(user));
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
