import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('api')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ── Product categories ──────────────────────────────────────────────

  @Get('product-categories')
  @RequirePermissions('products.read')
  listProductCategories(@Query() query: ListCategoriesDto) {
    return this.categoriesService.listProductCategories(query);
  }

  @Get('product-categories/:id')
  @RequirePermissions('products.read')
  getProductCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findProductCategoryById(id);
  }

  @Post('product-categories')
  @RequirePermissions('categories.write')
  createProductCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createProductCategory(dto);
  }

  @Patch('product-categories/:id')
  @RequirePermissions('categories.write')
  updateProductCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateProductCategory(id, dto);
  }

  @Delete('product-categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('categories.write')
  deleteProductCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.deleteProductCategory(id);
  }

  // ── Service categories ──────────────────────────────────────────────

  @Get('service-categories')
  @RequirePermissions('services.read')
  listServiceCategories(@Query() query: ListCategoriesDto) {
    return this.categoriesService.listServiceCategories(query);
  }

  @Get('service-categories/:id')
  @RequirePermissions('services.read')
  getServiceCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findServiceCategoryById(id);
  }

  @Post('service-categories')
  @RequirePermissions('categories.write')
  createServiceCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createServiceCategory(dto);
  }

  @Patch('service-categories/:id')
  @RequirePermissions('categories.write')
  updateServiceCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateServiceCategory(id, dto);
  }

  @Delete('service-categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('categories.write')
  deleteServiceCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.deleteServiceCategory(id);
  }
}
