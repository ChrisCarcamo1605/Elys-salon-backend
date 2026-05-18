import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { User } from '../staff/entities/user.entity';
import { TimeEntry } from '../timeclock/entities/time-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleLine, CatalogItem, User, TimeEntry]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
