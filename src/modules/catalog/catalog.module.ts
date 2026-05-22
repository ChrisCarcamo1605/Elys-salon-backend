import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogItem } from './entities/catalog-item.entity';
import { Category } from '../categories/entities/category.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogItem, Category, Promotion]), UploadModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
