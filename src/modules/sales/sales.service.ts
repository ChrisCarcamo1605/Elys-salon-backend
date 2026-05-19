import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Sale } from './entities/sale.entity';
import { SaleLine } from './entities/sale-line.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';
import { SaleStatus, ItemType, DiscountKind } from '../../common/enums';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class SalesService {
  private readonly logger = new AppLogger(SalesService.name);

  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine) private lineRepo: Repository<SaleLine>,
    @InjectRepository(SalePayment) private paymentRepo: Repository<SalePayment>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateSaleDto,
    user: { id: string; role: string; permissions: Record<string, boolean> },
  ): Promise<Sale> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.infoWithContext('Creating sale', {
        employeeId: dto.employeeId,
        linesCount: dto.lines.length,
        paymentsCount: dto.payments.length,
        userId: user.id,
      });

      let subtotal = 0;
      let discountTotal = 0;
      const lines: SaleLine[] = [];

      for (const lineDto of dto.lines) {
        const item = await queryRunner.manager.findOne(CatalogItem, {
          where: { id: lineDto.itemId },
        });
        if (!item) {
          this.logger.errorWithContext({
            message: 'Item not found during sale creation',
            context: { itemId: lineDto.itemId },
          });
          throw new NotFoundException(`Item ${lineDto.itemId} no encontrado`);
        }

        if (lineDto.discountKind || lineDto.discountValue) {
          if (user.role !== 'admin') {
            const overridden =
              user.permissions?.['tickets.discount'];
            if (!overridden) {
              this.logger.warnWithContext('Unauthorized discount attempt', {
                userId: user.id,
                userRole: user.role,
                itemId: lineDto.itemId,
              });
              throw new ForbiddenException(
                'No tienes permiso para aplicar descuentos',
              );
            }
          }
        }

        if (item.type === ItemType.PRODUCT) {
          if (item.stock < lineDto.qty) {
            this.logger.warnWithContext('Insufficient stock during sale', {
              itemId: item.id,
              itemName: item.name,
              requested: lineDto.qty,
              available: item.stock,
            });
            throw new BadRequestException(
              `Stock insuficiente para "${item.name}"`,
            );
          }
          item.stock -= lineDto.qty;
          await queryRunner.manager.save(item);
        }

        const lineTotal = lineDto.basePrice * lineDto.qty;
        let lineDiscount = 0;
        if (lineDto.discountKind === DiscountKind.PERCENT) {
          lineDiscount = lineTotal * ((lineDto.discountValue ?? 0) / 100);
        } else if (lineDto.discountKind === DiscountKind.AMOUNT) {
          lineDiscount = (lineDto.discountValue ?? 0) * lineDto.qty;
        }

        subtotal += lineTotal;
        discountTotal += lineDiscount;

        const line = queryRunner.manager.create(SaleLine, {
          saleId: '',
          itemId: lineDto.itemId,
          itemType: item.type,
          itemName: item.name,
          basePrice: item.price,
          price: lineDto.price,
          qty: lineDto.qty,
          discountKind: lineDto.discountKind,
          discountValue: lineDto.discountValue ?? 0,
          discountById:
            lineDto.discountById ??
            (lineDto.discountKind ? user.id : undefined),
        });
        lines.push(line);
      }

      const total = subtotal - discountTotal;
      const paymentSum = dto.payments.reduce((s, p) => s + p.amount, 0);
      if (Math.abs(paymentSum - total - (dto.tip ?? 0)) > 0.01) {
        this.logger.errorWithContext({
          message: 'Payment amount mismatch',
          context: { paymentSum, total, tip: dto.tip },
        });
        throw new BadRequestException(
          'El total de pagos no cuadra con el total de la venta',
        );
      }

      const sale = queryRunner.manager.create(Sale, {
        employeeId: dto.employeeId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerIsNew: dto.customerIsNew ?? false,
        subtotal,
        discountTotal,
        total,
        tip: dto.tip ?? 0,
        status: SaleStatus.COMPLETED,
      });

      const savedSale = await queryRunner.manager.save(sale);

      for (const line of lines) {
        line.saleId = savedSale.id;
        await queryRunner.manager.save(line);

        if (line.discountKind) {
          this.eventEmitter.emit('sale.discount', {
            saleId: savedSale.id,
            lineId: line.id,
            discountBy: line.discountById,
            discountKind: line.discountKind,
            discountValue: line.discountValue,
          });
        }
      }

      for (const payDto of dto.payments) {
        const payment = queryRunner.manager.create(SalePayment, {
          saleId: savedSale.id,
          method: payDto.method,
          amount: payDto.amount,
          cardLast4: payDto.cardLast4,
          cardBrand: payDto.cardBrand,
          authCode: payDto.authCode,
        });
        await queryRunner.manager.save(payment);
      }

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('sale.created', {
        saleId: savedSale.id,
        employeeId: dto.employeeId,
        total,
        customerIsNew: dto.customerIsNew,
      });

      this.logger.infoWithContext('Sale created successfully', {
        saleId: savedSale.id,
        total,
        linesCount: dto.lines.length,
      });

      return this.findOne(savedSale.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.errorWithContext({
        message: 'Failed to create sale - transaction rolled back',
        error: err,
        context: { employeeId: dto.employeeId, linesCount: dto.lines.length },
      });
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: ListSalesDto) {
    try {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;
      const qb = this.saleRepo
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.employee', 'employee')
        .leftJoinAndSelect('s.lines', 'lines')
        .leftJoinAndSelect('s.payments', 'payments')
        .orderBy('s.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize);

      if (query.employeeId)
        qb.andWhere('s.employeeId = :eid', { eid: query.employeeId });
      if (query.from) qb.andWhere('s.createdAt >= :from', { from: query.from });
      if (query.to) qb.andWhere('s.createdAt <= :to', { to: query.to });
      if (query.status)
        qb.andWhere('s.status = :status', { status: query.status });

      const [items, total] = await qb.getManyAndCount();
      this.logger.infoWithContext('Sales retrieved', {
        count: items.length,
        total,
        page,
        pageSize,
      });
      return { items, total, page, pageSize };
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve sales',
        error,
        context: { query },
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<Sale> {
    try {
      const sale = await this.saleRepo.findOne({
        where: { id },
        relations: [
          'employee',
          'lines',
          'lines.item',
          'lines.discountBy',
          'payments',
          'voidedBy',
        ],
      });
      if (!sale) {
        this.logger.errorWithContext({
          message: 'Sale not found',
          context: { id },
        });
        throw new NotFoundException('Venta no encontrada');
      }
      return sale;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to retrieve sale',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async voidSale(
    id: string,
    voidedById: string,
    reason?: string,
  ): Promise<Sale> {
    try {
      this.logger.infoWithContext('Voiding sale', { id, voidedById, reason });
      const sale = await this.findOne(id);
      if (sale.status === SaleStatus.VOIDED) {
        this.logger.warnWithContext('Attempted to void already voided sale', {
          id,
        });
        throw new BadRequestException('Venta ya anulada');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const lines = await queryRunner.manager.find(SaleLine, {
          where: { saleId: id },
        });
        for (const line of lines) {
          if (line.itemType === ItemType.PRODUCT) {
            await queryRunner.manager.increment(
              CatalogItem,
              { id: line.itemId },
              'stock',
              line.qty,
            );
            this.logger.infoWithContext('Stock restored for voided sale line', {
              itemId: line.itemId,
              qty: line.qty,
            });
          }
        }

        await queryRunner.manager.update(Sale, id, {
          status: SaleStatus.VOIDED,
          voidedById,
          voidedAt: new Date(),
        });

        await queryRunner.commitTransaction();

        this.eventEmitter.emit('sale.voided', {
          saleId: id,
          voidedById,
          reason,
        });

        this.logger.infoWithContext('Sale voided successfully', {
          id,
          voidedById,
          reason,
        });

        return this.findOne(id);
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.logger.errorWithContext({
          message: 'Failed to void sale - transaction rolled back',
          error: err,
          context: { id, voidedById, reason },
        });
        throw err;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.errorWithContext({
        message: 'Failed to void sale',
        error,
        context: { id, voidedById, reason },
      });
      throw error;
    }
  }

  async getSalesByEmployee(
    employeeId: string,
    from: Date,
    to: Date,
    status?: SaleStatus,
  ) {
    try {
      const qb = this.saleRepo
        .createQueryBuilder('s')
        .where('s.employeeId = :eid', { eid: employeeId })
        .andWhere('s.createdAt >= :from', { from })
        .andWhere('s.createdAt <= :to', { to });

      if (status) qb.andWhere('s.status = :status', { status });
      else qb.andWhere('s.status = :status', { status: SaleStatus.COMPLETED });

      const result = await qb.getMany();
      this.logger.infoWithContext('Sales by employee retrieved', {
        employeeId,
        count: result.length,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve sales by employee',
        error,
        context: { employeeId, from, to, status },
      });
      throw error;
    }
  }

  async getSalesByDateRange(from: Date, to: Date, status?: SaleStatus) {
    try {
      const qb = this.saleRepo
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.lines', 'lines')
        .where('s.createdAt >= :from', { from })
        .andWhere('s.createdAt <= :to', { to });

      if (status) qb.andWhere('s.status = :status', { status });
      else qb.andWhere('s.status = :status', { status: SaleStatus.COMPLETED });

      const result = await qb.getMany();
      this.logger.infoWithContext('Sales by date range retrieved', {
        count: result.length,
        from,
        to,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve sales by date range',
        error,
        context: { from, to, status },
      });
      throw error;
    }
  }
}
