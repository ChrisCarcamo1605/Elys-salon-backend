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
import { UpdateProductStockAlertDto } from './dto/update-product-stock-alert.dto';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class AlertsService {
  private readonly logger = new AppLogger(AlertsService.name);

  constructor(
    @InjectRepository(Alert) private alertRepo: Repository<Alert>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
  ) {}

  async findAll() {
    try {
      const [lowStock, discountReviews, rawSlowMovers, promotions] =
        await Promise.all([
          this.getLowStockProducts(),
          this.alertRepo.find({ where: { type: AlertType.DISCOUNT_REVIEW } }),
          this.alertRepo.find({ where: { type: AlertType.SLOW_MOVER } }),
          this.alertRepo.find({ where: { type: AlertType.PROMO } }),
        ]);

      // Enrich slow movers with product data (price, stock, etc.)
      const slowMovers = await Promise.all(
        rawSlowMovers.map(async (alert) => {
          const product = alert.resourceId
            ? await this.catalogRepo.findOne({
                where: { id: alert.resourceId },
              })
            : null;
          return {
            id: alert.id,
            name: product?.name ?? alert.notes ?? 'Producto desconocido',
            basePrice: product?.price != null ? Number(product.price) : 0,
            stock: product?.stock ?? 0,
            lastSold: 'Sin ventas recientes',
            suggested: {
              kind: alert.suggestedOfferKind ?? DiscountKind.PERCENT,
              value:
                alert.suggestedOfferValue != null
                  ? Number(alert.suggestedOfferValue)
                  : 10,
            },
            live: alert.offerActive ?? false,
          };
        }),
      );

      const result = {
        lowStock,
        discountReviews,
        slowMovers,
        promotions,
      };

      this.logger.infoWithContext('Alerts retrieved', {
        lowStockCount: lowStock.length,
        discountReviewsCount: discountReviews.length,
        slowMoversCount: slowMovers.length,
        promotionsCount: promotions.length,
      });

      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve alerts',
        error,
      });
      throw error;
    }
  }

  private async getLowStockProducts() {
    try {
      const products = await this.catalogRepo.find({
        where: { type: 'P' as any, alertEnabled: true, active: true },
      });
      const lowStock = products
        .filter(
          (p) =>
            p.stock !== null &&
            p.stock !== undefined &&
            p.stock < (p.stockMin ?? 3),
        )
        .map((p) => ({
          id: p.id,
          productId: p.id,
          name: p.name,
          stock: p.stock,
          stockMin: p.stockMin ?? 3,
          minStock: p.stockMin ?? 3,
          brand: p.brand,
          alertEnabled: p.alertEnabled,
        }));

      if (lowStock.length > 0) {
        this.logger.warnWithContext('Low stock products detected', {
          count: lowStock.length,
          products: lowStock.map((p) => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            stockMin: p.stockMin,
          })),
        });
      }

      return lowStock;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to get low stock products',
        error,
      });
      throw error;
    }
  }

  async checkAllLowStock() {
    const products = await this.catalogRepo.find({
      where: { type: 'P' as any, alertEnabled: true, active: true },
    });
    for (const product of products) {
      await this.checkLowStock(product.id);
    }
  }

  async createDiscountReviewAlert(
    saleId: string,
    lineId: string,
    discountBy: string | undefined,
    discountKind: string,
    discountValue: number,
  ) {
    try {
      const existing = await this.alertRepo.findOne({
        where: {
          type: AlertType.DISCOUNT_REVIEW,
          resourceId: lineId,
          status: AlertStatus.ACTIVE,
        },
      });
      if (existing) {
        this.logger.infoWithContext(
          'Discount review alert already exists, skipping',
          { saleId, lineId },
        );
        return;
      }

      await this.alertRepo.save(
        this.alertRepo.create({
          type: AlertType.DISCOUNT_REVIEW,
          resourceId: lineId,
          status: AlertStatus.ACTIVE,
          notes: `Descuento ${discountKind}: ${discountValue} en venta ${saleId}`,
        }),
      );

      this.logger.infoWithContext('Discount review alert created', {
        saleId,
        lineId,
        discountKind,
        discountValue,
      });
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to create discount review alert',
        error,
        context: { saleId, lineId, discountKind, discountValue },
      });
      throw error;
    }
  }

  async checkLowStock(productId: string) {
    try {
      const product = await this.catalogRepo.findOne({
        where: { id: productId },
      });
      if (!product || product.type !== ('P' as any) || !product.alertEnabled) {
        this.logger.infoWithContext(
          'Product not eligible for low stock check',
          { productId },
        );
        return;
      }

      const threshold = product.stockMin ?? 3;
      const isLow = product.stock !== null && product.stock !== undefined && product.stock < threshold;

      const existing = await this.alertRepo.findOne({
        where: {
          type: AlertType.LOW_STOCK,
          resourceId: productId,
          status: AlertStatus.ACTIVE,
        },
      });

      if (isLow) {
        if (!existing) {
          await this.alertRepo.save(
            this.alertRepo.create({
              type: AlertType.LOW_STOCK,
              resourceId: productId,
              status: AlertStatus.ACTIVE,
              notes: `Stock bajo: ${product.stock} unidades (mínimo: ${threshold})`,
            }),
          );
          this.logger.infoWithContext('Low stock alert created', {
            productId,
            stock: product.stock,
            threshold,
          });
        }
      } else {
        if (existing) {
          existing.status = AlertStatus.RESOLVED;
          await this.alertRepo.save(existing);
          this.logger.infoWithContext('Low stock alert resolved', {
            productId,
            stock: product.stock,
            threshold,
          });
        }
      }
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to check low stock',
        error,
        context: { productId },
      });
      throw error;
    }
  }

  async createSlowMoverAlert(productId: string, name: string) {
    try {
      const existing = await this.alertRepo.findOne({
        where: {
          type: AlertType.SLOW_MOVER,
          resourceId: productId,
          status: AlertStatus.ACTIVE,
        },
      });
      if (existing) {
        this.logger.infoWithContext(
          'Slow mover alert already exists, skipping',
          { productId, name },
        );
        return;
      }

      await this.alertRepo.save(
        this.alertRepo.create({
          type: AlertType.SLOW_MOVER,
          resourceId: productId,
          status: AlertStatus.ACTIVE,
          suggestedOfferKind: DiscountKind.PERCENT,
          suggestedOfferValue: 10,
          offerActive: false,
          notes: `Producto sin ventas recientes: ${name}`,
        }),
      );

      this.logger.warnWithContext('Slow mover alert created', {
        productId,
        name,
      });
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to create slow mover alert',
        error,
        context: { productId, name },
      });
      throw error;
    }
  }

  async resolve(id: string, userId: string, dto?: ResolveAlertDto) {
    try {
      this.logger.infoWithContext('Resolving alert', { id, userId });
      const alert = await this.alertRepo.findOne({ where: { id } });
      if (!alert) {
        this.logger.errorWithContext({
          message: 'Alert not found for resolution',
          context: { id, userId },
        });
        throw new NotFoundException('Alerta no encontrada');
      }

      alert.status = AlertStatus.RESOLVED;
      alert.resolvedById = userId;
      alert.resolvedAt = new Date();
      if (dto?.notes) alert.notes = dto.notes;

      const saved = await this.alertRepo.save(alert);
      this.logger.infoWithContext('Alert resolved successfully', {
        id,
        userId,
      });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to resolve alert',
        error,
        context: { id, userId },
      });
      throw error;
    }
  }

  async snooze(id: string, dto: SnoozeAlertDto) {
    try {
      this.logger.infoWithContext('Snoozing alert', {
        id,
        snoozedUntil: dto.snoozedUntil,
      });
      const alert = await this.alertRepo.findOne({ where: { id } });
      if (!alert) {
        this.logger.errorWithContext({
          message: 'Alert not found for snoozing',
          context: { id },
        });
        throw new NotFoundException('Alerta no encontrada');
      }

      alert.status = AlertStatus.SNOOZED;
      alert.snoozedUntil = new Date(dto.snoozedUntil);

      const saved = await this.alertRepo.save(alert);
      this.logger.infoWithContext('Alert snoozed successfully', {
        id,
        snoozedUntil: dto.snoozedUntil,
      });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to snooze alert',
        error,
        context: { id, dto },
      });
      throw error;
    }
  }

  async reopen(id: string) {
    try {
      this.logger.infoWithContext('Reopening alert', { id });
      const alert = await this.alertRepo.findOne({ where: { id } });
      if (!alert) {
        this.logger.errorWithContext({
          message: 'Alert not found for reopening',
          context: { id },
        });
        throw new NotFoundException('Alerta no encontrada');
      }

      alert.status = AlertStatus.ACTIVE;
      alert.snoozedUntil = undefined as any;
      alert.resolvedById = undefined as any;
      alert.resolvedAt = undefined as any;

      const saved = await this.alertRepo.save(alert);
      this.logger.infoWithContext('Alert reopened successfully', { id });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to reopen alert',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async updateSlowMover(id: string, dto: UpdateSlowMoverDto) {
    try {
      this.logger.infoWithContext('Updating slow mover alert', {
        id,
        changes: Object.keys(dto),
      });
      const alert = await this.alertRepo.findOne({ where: { id } });
      if (!alert) {
        this.logger.errorWithContext({
          message: 'Alert not found for update',
          context: { id },
        });
        throw new NotFoundException('Alerta no encontrada');
      }

      if (dto.suggestedOfferKind !== undefined)
        alert.suggestedOfferKind = dto.suggestedOfferKind;
      if (dto.suggestedOfferValue !== undefined)
        alert.suggestedOfferValue = dto.suggestedOfferValue;
      if (dto.offerActive !== undefined) alert.offerActive = dto.offerActive;

      const saved = await this.alertRepo.save(alert);
      this.logger.infoWithContext('Slow mover alert updated successfully', {
        id,
      });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to update slow mover alert',
        error,
        context: { id, dto },
      });
      throw error;
    }
  }

  async updateProductStockAlert(
    productId: string,
    dto: UpdateProductStockAlertDto,
  ) {
    try {
      this.logger.infoWithContext('Updating product stock alert config', {
        productId,
        changes: Object.keys(dto),
      });
      const product = await this.catalogRepo.findOne({
        where: { id: productId },
      });
      if (!product) {
        this.logger.errorWithContext({
          message: 'Product not found for stock alert update',
          context: { productId },
        });
        throw new NotFoundException('Producto no encontrado');
      }

      if (dto.alertEnabled !== undefined)
        product.alertEnabled = dto.alertEnabled;
      if (dto.stockMin !== undefined) product.stockMin = dto.stockMin;

      const saved = await this.catalogRepo.save(product);
      this.logger.infoWithContext(
        'Product stock alert config updated successfully',
        { productId },
      );
      return {
        id: saved.id,
        alertEnabled: saved.alertEnabled,
        stockMin: saved.stockMin,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to update product stock alert config',
        error,
        context: { productId, dto },
      });
      throw error;
    }
  }

  async updateStockConfig(dto: StockConfigDto) {
    try {
      this.logger.infoWithContext('Updating stock configuration', {
        defaultMinStock: dto.defaultMinStock,
        enabledByDefault: dto.enabledByDefault,
      });
      const items = await this.catalogRepo.find({
        where: { type: 'P' as any },
      });

      for (const item of items) {
        if (item.stockMin === null) {
          item.stockMin = dto.defaultMinStock;
        }
        item.alertEnabled = dto.enabledByDefault;
        await this.catalogRepo.save(item);
      }

      this.logger.infoWithContext('Stock configuration updated', {
        itemsUpdated: items.length,
      });
      return {
        defaultMinStock: dto.defaultMinStock,
        enabledByDefault: dto.enabledByDefault,
      };
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to update stock configuration',
        error,
        context: { dto },
      });
      throw error;
    }
  }

  async reopenSnoozed() {
    try {
      const now = new Date();
      const snoozed = await this.alertRepo.find({
        where: { status: AlertStatus.SNOOZED },
      });
      let reopenedCount = 0;

      for (const alert of snoozed) {
        if (alert.snoozedUntil && alert.snoozedUntil <= now) {
          alert.status = AlertStatus.ACTIVE;
          alert.snoozedUntil = undefined as any;
          await this.alertRepo.save(alert);
          reopenedCount++;
          this.logger.infoWithContext('Snoozed alert reopened automatically', {
            alertId: alert.id,
          });
        }
      }

      if (reopenedCount > 0) {
        this.logger.infoWithContext('Snoozed alerts reopened', {
          count: reopenedCount,
        });
      }
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to reopen snoozed alerts',
        error,
      });
      throw error;
    }
  }

  async checkSlowMovers(daysThreshold: number) {
    try {
      this.logger.infoWithContext('Checking slow movers', { daysThreshold });
      const products = await this.catalogRepo.find({
        where: { type: 'P' as any, active: true },
      });
      const saleLineRepo = this.alertRepo.manager.getRepository('SaleLine');
      const now = new Date();
      const threshold = new Date(
        now.getTime() - daysThreshold * 24 * 60 * 60 * 1000,
      );
      let slowMoverCount = 0;

      for (const product of products) {
        const recentSales = await saleLineRepo
          .createQueryBuilder('l')
          .leftJoin('l.sale', 's')
          .where('l.itemId = :pid', { pid: product.id })
          .andWhere('s.createdAt >= :threshold', { threshold })
          .andWhere('s.status = :status', { status: 'completed' })
          .getCount();

        if (recentSales === 0) {
          await this.createSlowMoverAlert(product.id, product.name);
          slowMoverCount++;
        }
      }

      if (slowMoverCount > 0) {
        this.logger.warnWithContext('Slow movers detected', {
          count: slowMoverCount,
          daysThreshold,
        });
      }
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to check slow movers',
        error,
        context: { daysThreshold },
      });
      throw error;
    }
  }
}
