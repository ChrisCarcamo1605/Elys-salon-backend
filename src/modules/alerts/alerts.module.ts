import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertsListener } from './alerts.listener';
import { AlertCrons } from './alerts.cron';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, CatalogItem])],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsListener, AlertCrons],
  exports: [AlertsService],
})
export class AlertsModule {}