import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertsService } from './alerts.service';

@Injectable()
export class AlertsListener {
  private readonly logger = new Logger(AlertsListener.name);

  constructor(private readonly alertsService: AlertsService) {}

  @OnEvent('sale.discount')
  handleSaleDiscount(payload: {
    saleId: string;
    lineId: string;
    discountBy: string | undefined;
    discountKind: string;
    discountValue: number;
  }) {
    this.alertsService
      .createDiscountReviewAlert(
        payload.saleId,
        payload.lineId,
        payload.discountBy,
        payload.discountKind,
        payload.discountValue,
      )
      .catch((err) =>
        this.logger.error('Failed to create discount_review alert', err),
      );
  }

  @OnEvent('inventory.changed')
  handleInventoryChanged(payload: { productId: string; stockAfter: number }) {
    this.alertsService
      .checkLowStock(payload.productId)
      .catch((err) => this.logger.error('Failed to check low stock', err));
  }
}
