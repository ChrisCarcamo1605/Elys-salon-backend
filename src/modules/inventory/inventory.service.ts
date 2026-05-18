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

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryEntry) private entryRepo: Repository<InventoryEntry>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createEntry(dto: CreateEntryDto, userId: string): Promise<InventoryEntry> {
    const product = await this.catalogRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const stockAfter = (product.stock ?? 0) + dto.qtyDelta;
    product.stock = stockAfter;
    await this.catalogRepo.save(product);

    const entry = this.entryRepo.create({
      ...dto,
      stockAfter,
      createdById: userId,
    });
    const saved = await this.entryRepo.save(entry);
    this.eventEmitter.emit('inventory.changed', { productId: dto.productId, stockAfter });
    return saved;
  }

  async createAdjustment(dto: CreateAdjustmentDto, userId: string): Promise<InventoryEntry> {
    const product = await this.catalogRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    let qtyDelta: number;
    let stockAfter: number;

    if (dto.mode === 'set') {
      stockAfter = dto.value;
      qtyDelta = dto.value - (product.stock ?? 0);
    } else {
      qtyDelta = dto.value;
      stockAfter = (product.stock ?? 0) + dto.value;
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
    this.eventEmitter.emit('inventory.changed', { productId: dto.productId, stockAfter });
    return saved;
  }

  async findAll(query: ListEntriesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const qb = this.entryRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.product', 'product')
      .leftJoinAndSelect('e.createdBy', 'createdBy')
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.productId) qb.andWhere('e.productId = :pid', { pid: query.productId });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }
}