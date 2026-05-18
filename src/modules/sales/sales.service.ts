import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine) private lineRepo: Repository<SaleLine>,
    @InjectRepository(SalePayment) private paymentRepo: Repository<SalePayment>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateSaleDto, user: { id: string; role: string; permissions: Record<string, boolean> }): Promise<Sale> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let subtotal = 0;
      let discountTotal = 0;
      const lines: SaleLine[] = [];

      for (const lineDto of dto.lines) {
        const item = await queryRunner.manager.findOne(CatalogItem, { where: { id: lineDto.itemId } });
        if (!item) throw new NotFoundException(`Item ${lineDto.itemId} no encontrado`);

        if (lineDto.discountKind || lineDto.discountValue) {
          if (user.role !== 'admin') {
            const overridden = user.permissions?.['Modificar precios y descuentos'];
            if (!overridden) throw new ForbiddenException('No tienes permiso para aplicar descuentos');
          }
        }

        if (item.type === ItemType.PRODUCT) {
          if (item.stock < lineDto.qty) {
            throw new BadRequestException(`Stock insuficiente para "${item.name}"`);
          }
          item.stock -= lineDto.qty;
          await queryRunner.manager.save(item);
        }

        const lineTotal = lineDto.price * lineDto.qty;
        let lineDiscount = 0;
        if (lineDto.discountKind === DiscountKind.PERCENT) {
          lineDiscount = lineTotal * ((lineDto.discountValue ?? 0) / 100);
        } else if (lineDto.discountKind === DiscountKind.AMOUNT) {
          lineDiscount = lineDto.discountValue ?? 0;
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
          discountById: lineDto.discountById ?? (lineDto.discountKind ? user.id : undefined),
        });
        lines.push(line);
      }

      const total = subtotal - discountTotal;
      const paymentSum = dto.payments.reduce((s, p) => s + p.amount, 0);
      if (Math.abs(paymentSum - total - (dto.tip ?? 0)) > 0.01) {
        throw new BadRequestException('El total de pagos no cuadra con el total de la venta');
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
          this.eventEmitter.emit('sale.discount', { saleId: savedSale.id, lineId: line.id, discountBy: line.discountById, discountKind: line.discountKind, discountValue: line.discountValue });
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

      this.eventEmitter.emit('sale.created', { saleId: savedSale.id, employeeId: dto.employeeId, total, customerIsNew: dto.customerIsNew });

      return this.findOne(savedSale.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: ListSalesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const qb = this.saleRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.employee', 'employee')
      .leftJoinAndSelect('s.lines', 'lines')
      .leftJoinAndSelect('s.payments', 'payments')
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.employeeId) qb.andWhere('s.employeeId = :eid', { eid: query.employeeId });
    if (query.from) qb.andWhere('s.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('s.createdAt <= :to', { to: query.to });
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<Sale> {
    const sale = await this.saleRepo.findOne({
      where: { id },
      relations: ['employee', 'lines', 'lines.item', 'lines.discountBy', 'payments', 'voidedBy'],
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async voidSale(id: string, voidedById: string, reason?: string): Promise<Sale> {
    const sale = await this.findOne(id);
    if (sale.status === SaleStatus.VOIDED) throw new BadRequestException('Venta ya anulada');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lines = await queryRunner.manager.find(SaleLine, { where: { saleId: id } });
      for (const line of lines) {
        if (line.itemType === ItemType.PRODUCT) {
          await queryRunner.manager.increment(CatalogItem, { id: line.itemId }, 'stock', line.qty);
        }
      }

      await queryRunner.manager.update(Sale, id, {
        status: SaleStatus.VOIDED,
        voidedById,
        voidedAt: new Date(),
      });

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('sale.voided', { saleId: id, voidedById, reason });

      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getSalesByEmployee(employeeId: string, from: Date, to: Date, status?: SaleStatus) {
    const qb = this.saleRepo.createQueryBuilder('s')
      .where('s.employeeId = :eid', { eid: employeeId })
      .andWhere('s.createdAt >= :from', { from })
      .andWhere('s.createdAt <= :to', { to });

    if (status) qb.andWhere('s.status = :status', { status });
    else qb.andWhere('s.status = :status', { status: SaleStatus.COMPLETED });

    return qb.getMany();
  }

  async getSalesByDateRange(from: Date, to: Date, status?: SaleStatus) {
    const qb = this.saleRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.lines', 'lines')
      .where('s.createdAt >= :from', { from })
      .andWhere('s.createdAt <= :to', { to });

    if (status) qb.andWhere('s.status = :status', { status });
    else qb.andWhere('s.status = :status', { status: SaleStatus.COMPLETED });

    return qb.getMany();
  }
}