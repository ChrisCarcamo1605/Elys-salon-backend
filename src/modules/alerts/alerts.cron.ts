import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertsService } from '../alerts/alerts.service';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class AlertCrons {
  private readonly logger = new Logger(AlertCrons.name);

  constructor(
    private alertsService: AlertsService,
    private config: ConfigService<AppConfig>,
  ) {}

  @Cron('0 8 * * *')
  async handleLowStockCheck() {
    this.logger.log('Running daily low stock check...');
    // Low stock is computed on-the-fly, no action needed
  }

  @Cron('0 * * * *')
  async handleSnoozeReopen() {
    this.logger.log('Reopening snoozed alerts...');
    await this.alertsService.reopenSnoozed();
  }

  @Cron('0 9 * * *')
  async handleSlowMoverCheck() {
    this.logger.log('Running slow mover check...');
    const days = this.config.get<number>('slowMoverDays', { infer: true }) ?? 14;
    await this.alertsService.checkSlowMovers(days);
  }
}