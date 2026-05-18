import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { AlertStatus, AlertType, DiscountKind } from '../../common/enums';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { SnoozeAlertDto } from './dto/snooze-alert.dto';
import { StockConfigDto } from './dto/stock-config.dto';
import { UpdateSlowMoverDto } from './dto/update-slow-mover.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert) private alertRepo: Repository<Alert>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
  ) {}

  async findAll() {
    const [lowStock, discountReviews, slowMovers, promotions] = await Promise.all([
      this.getLowStockProducts(),
      this.alertRepo.find({ where: { type: AlertType.DISCOUNT_REVIEW } }),
      this.alertRepo.find({ where: { type: AlertType.SLOW_MOVER } }),
      this.alertRepo.find({ where: { type: AlertType.PROMO } }),
    ]);

    return {
      lowStock,
      discountReviews,
      slowMovers,
      promotions,
    };
  }

  private async getLowStockProducts() {
    const products = await this.catalogRepo.find({
      where: { type: 'P' as any, alertEnabled: true, active: true },
    });
    return products
      .filter(p => p.stock !== null && p.stock !== undefined && p.stock < (p.stockMin ?? 3))
      .map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        stockMin: p.stockMin ?? 3,
        brand: p.brand,
        alertEnabled: p.alertEnabled,
      }));
  }

  async createDiscountReviewAlert(saleId: string, lineId: string, discountBy: string | undefined, discountKind: string, discountValue: number) {
    const existing = await this.alertRepo.findOne({
      where: { type: AlertType.DISCOUNT_REVIEW, resourceId: lineId, status: AlertStatus.ACTIVE },
    });
    if (existing) return;

    await this.alertRepo.save(this.alertRepo.create({
      type: AlertType.DISCOUNT_REVIEW,
      resourceId: lineId,
      status: AlertStatus.ACTIVE,
      notes: `Descuento ${discountKind}: ${discountValue} en venta ${saleId}`,
    }));
  }

  async checkLowStock(productId: string) {
    const product = await this.catalogRepo.findOne({ where: { id: productId } });
    if (!product || product.type !== ('P' as any) || !product.alertEnabled) return;
    // Low stock is computed on-the-fly from the catalog items query, no alert record needed
  }

  async createSlowMoverAlert(productId: string, name: string) {
    const existing = await this.alertRepo.findOne({
      where: { type: AlertType.SLOW_MOVER, resourceId: productId, status: AlertStatus.ACTIVE },
    });
    if (existing) return;

    await this.alertRepo.save(this.alertRepo.create({
      type: AlertType.SLOW_MOVER,
      resourceId: productId,
      status: AlertStatus.ACTIVE,
      suggestedOfferKind: DiscountKind.PERCENT,
      suggestedOfferValue: 10,
      offerActive: false,
      notes: `Producto sin ventas recientes: ${name}`,
    }));
  }

  async resolve(id: string, userId: string, dto?: ResolveAlertDto) {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    alert.status = AlertStatus.RESOLVED;
    alert.resolvedById = userId;
    alert.resolvedAt = new Date();
    if (dto?.notes) alert.notes = dto.notes;
    return this.alertRepo.save(alert);
  }

  async snooze(id: string, dto: SnoozeAlertDto) {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    alert.status = AlertStatus.SNOOZED;
    alert.snoozedUntil = new Date(dto.snoozedUntil);
    return this.alertRepo.save(alert);
  }

  async reopen(id: string) {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    alert.status = AlertStatus.ACTIVE;
    alert.snoozedUntil = undefined as any;
    alert.resolvedById = undefined as any;
    alert.resolvedAt = undefined as any;
    return this.alertRepo.save(alert);
  }

  async updateSlowMover(id: string, dto: UpdateSlowMoverDto) {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    if (dto.suggestedOfferKind !== undefined) alert.suggestedOfferKind = dto.suggestedOfferKind;
    if (dto.suggestedOfferValue !== undefined) alert.suggestedOfferValue = dto.suggestedOfferValue;
    if (dto.offerActive !== undefined) alert.offerActive = dto.offerActive;
    return this.alertRepo.save(alert);
  }

  async updateStockConfig(dto: StockConfigDto) {
    const items = await this.catalogRepo.find({ where: { type: 'P' as any } });
    for (const item of items) {
      if (item.stockMin === null) {
        item.stockMin = dto.defaultMinStock;
      }
      item.alertEnabled = dto.enabledByDefault;
      await this.catalogRepo.save(item);
    }
    return { defaultMinStock: dto.defaultMinStock, enabledByDefault: dto.enabledByDefault };
  }

  async reopenSnoozed() {
    const now = new Date();
    const snoozed = await this.alertRepo.find({ where: { status: AlertStatus.SNOOZED } });
    for (const alert of snoozed) {
      if (alert.snoozedUntil && alert.snoozedUntil <= now) {
        alert.status = AlertStatus.ACTIVE;
        alert.snoozedUntil = undefined as any;
        await this.alertRepo.save(alert);
      }
    }
  }

  async checkSlowMovers(daysThreshold: number) {
    const products = await this.catalogRepo.find({ where: { type: 'P' as any, active: true } });
    const saleLineRepo = this.alertRepo.manager.getRepository('SaleLine');
    const now = new Date();
    const threshold = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

    for (const product of products) {
      const recentSales = await saleLineRepo.createQueryBuilder('l')
        .leftJoin('l.sale', 's')
        .where('l.itemId = :pid', { pid: product.id })
        .andWhere('s.createdAt >= :threshold', { threshold })
        .andWhere('s.status = :status', { status: 'completed' })
        .getCount();

      if (recentSales === 0) {
        await this.createSlowMoverAlert(product.id, product.name);
      }
    }
  }
}