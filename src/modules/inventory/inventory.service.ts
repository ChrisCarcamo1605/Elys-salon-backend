import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryEntry } from './entities/inventory-entry.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { InventoryKind } from '../../common/enums';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { ListEntriesDto } from './dto/list-entries.dto';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class InventoryService {
  private readonly logger = new AppLogger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryEntry)
    private entryRepo: Repository<InventoryEntry>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * @param canSetCost quien no puede ver el costo tampoco lo fija: la entrada
   *   se valoriza con el costo que ya tiene el producto y se ignora lo que
   *   venga en el body (que ni siquiera se le muestra en el formulario).
   */
  async createEntry(
    dto: CreateEntryDto,
    userId: string,
    canSetCost = true,
  ): Promise<InventoryEntry> {
    try {
      this.logger.infoWithContext('Creating inventory entry', {
        productId: dto.productId,
        qtyDelta: dto.qtyDelta,
        userId,
      });

      const product = await this.catalogRepo.findOne({
        where: { id: dto.productId },
      });
      if (!product) {
        this.logger.errorWithContext({
          message: 'Product not found for inventory entry',
          context: { productId: dto.productId },
        });
        throw new NotFoundException('Producto no encontrado');
      }

      const stockBefore = product.stock ?? 0;
      const stockAfter = stockBefore + dto.qtyDelta;
      product.stock = stockAfter;
      await this.catalogRepo.save(product);

      const unitCost = canSetCost
        ? (dto.unitCost ?? Number(product.cost ?? 0))
        : Number(product.cost ?? 0);
      const totalCost =
        canSetCost && dto.totalCost != null
          ? dto.totalCost
          : +(unitCost * dto.qtyDelta).toFixed(2);

      const entry = this.entryRepo.create({
        ...dto,
        unitCost,
        totalCost,
        stockAfter,
        createdById: userId,
      });
      const saved = await this.entryRepo.save(entry);

      this.logger.infoWithContext('Inventory entry created successfully', {
        entryId: saved.id,
        productId: dto.productId,
        stockBefore,
        stockAfter,
        qtyDelta: dto.qtyDelta,
      });

      this.eventEmitter.emit('inventory.changed', {
        productId: dto.productId,
        stockAfter,
      });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to create inventory entry',
        error,
        context: { dto, userId },
      });
      throw error;
    }
  }

  async createAdjustment(
    dto: CreateAdjustmentDto,
    userId: string,
  ): Promise<InventoryEntry> {
    try {
      this.logger.infoWithContext('Creating inventory adjustment', {
        productId: dto.productId,
        mode: dto.mode,
        value: dto.value,
        userId,
      });

      const product = await this.catalogRepo.findOne({
        where: { id: dto.productId },
      });
      if (!product) {
        this.logger.errorWithContext({
          message: 'Product not found for inventory adjustment',
          context: { productId: dto.productId },
        });
        throw new NotFoundException('Producto no encontrado');
      }

      let qtyDelta: number;
      let stockAfter: number;
      const stockBefore = product.stock ?? 0;

      if (dto.mode === 'set') {
        stockAfter = dto.value;
        qtyDelta = dto.value - stockBefore;
      } else {
        qtyDelta = dto.value;
        stockAfter = stockBefore + dto.value;
      }

      product.stock = stockAfter;
      await this.catalogRepo.save(product);

      const entry = this.entryRepo.create({
        productId: dto.productId,
        kind: InventoryKind.ADJUSTMENT,
        qtyDelta,
        stockAfter,
        reason: dto.reason,
        notes: dto.notes,
        createdById: userId,
      });
      const saved = await this.entryRepo.save(entry);

      this.logger.infoWithContext('Inventory adjustment created successfully', {
        entryId: saved.id,
        productId: dto.productId,
        stockBefore,
        stockAfter,
        qtyDelta,
        reason: dto.reason,
      });

      this.eventEmitter.emit('inventory.changed', {
        productId: dto.productId,
        stockAfter,
      });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to create inventory adjustment',
        error,
        context: { dto, userId },
      });
      throw error;
    }
  }

  async findAll(query: ListEntriesDto) {
    try {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;
      const qb = this.entryRepo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.product', 'product')
        // Solo los campos de identificación: un leftJoinAndSelect completo
        // arrastraba pinHash / passwordHash / devPin de quien registró la
        // entrada, y este listado lo lee cualquiera con 'inventory.read'.
        .leftJoin('e.createdBy', 'createdBy')
        .addSelect(['createdBy.id', 'createdBy.name', 'createdBy.initials'])
        .orderBy('e.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize);

      if (query.productId)
        qb.andWhere('e.productId = :pid', { pid: query.productId });

      const [items, total] = await qb.getManyAndCount();
      this.logger.infoWithContext('Inventory entries retrieved', {
        count: items.length,
        total,
        page,
        pageSize,
        productId: query.productId,
      });
      return { items, total, page, pageSize };
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve inventory entries',
        error,
        context: { query },
      });
      throw error;
    }
  }
}
