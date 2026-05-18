import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogItem } from './entities/catalog-item.entity';
import { Category } from '../categories/entities/category.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { ItemType } from '../../common/enums';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class CatalogService {
  private readonly logger = new AppLogger(CatalogService.name);

  constructor(
    @InjectRepository(CatalogItem) private repo: Repository<CatalogItem>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(type?: ItemType, categoryId?: string, active?: boolean) {
    try {
      const qb = this.repo
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.category', 'category')
        .orderBy('item.name');

      if (type) qb.andWhere('item.type = :type', { type });
      if (categoryId)
        qb.andWhere('item.categoryId = :categoryId', { categoryId });
      if (active !== undefined)
        qb.andWhere('item.active = :active', { active });

      const result = await qb.getMany();
      this.logger.infoWithContext('Catalog items retrieved', {
        count: result.length,
        type,
        categoryId,
        active,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve catalog items',
        error,
        context: { type, categoryId, active },
      });
      throw error;
    }
  }

  async getCatalog() {
    try {
      const [categories, items, promos] = await Promise.all([
        this.catRepo.find({ order: { ordering: 'ASC' } }),
        this.repo.find({
          where: { active: true },
          relations: ['category', 'promotions'],
          order: { name: 'ASC' },
        }),
        this.promoRepo.find({
          where: { active: true },
          relations: ['items'],
        }),
      ]);

      const promoMap = new Map<string, Promotion[]>();
      for (const promo of promos) {
        for (const item of promo.items) {
          const list = promoMap.get(item.id) ?? [];
          list.push(promo);
          promoMap.set(item.id, list);
        }
      }

      const itemsWithPromos = items.map((item) => ({
        ...item,
        promotions: (promoMap.get(item.id) ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          off: p.off,
          description: p.description,
        })),
      }));

      this.logger.infoWithContext('Catalog retrieved', {
        categoriesCount: categories.length,
        itemsCount: itemsWithPromos.length,
      });
      return { categories, items: itemsWithPromos };
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve catalog',
        error,
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<CatalogItem> {
    try {
      const item = await this.repo.findOne({
        where: { id },
        relations: ['category'],
      });
      if (!item) {
        this.logger.warnWithContext('Catalog item not found', { id });
        throw new NotFoundException(`Item no encontrado (ID: ${id})`);
      }
      return item;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to retrieve catalog item',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async create(dto: CreateCatalogItemDto): Promise<CatalogItem> {
    try {
      this.logger.infoWithContext('Creating catalog item', {
        name: dto.name,
        type: dto.type,
      });
      const item = this.repo.create(dto);
      const saved = await this.repo.save(item);
      this.logger.infoWithContext('Catalog item created successfully', {
        id: saved.id,
        name: saved.name,
      });
      return saved;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to create catalog item',
        error,
        context: { dto },
      });
      throw error;
    }
  }

  async update(id: string, dto: UpdateCatalogItemDto): Promise<CatalogItem> {
    try {
      this.logger.infoWithContext('Updating catalog item', {
        id,
        changes: Object.keys(dto),
      });
      const item = await this.findOne(id);
      Object.assign(item, dto);
      const saved = await this.repo.save(item);
      this.logger.infoWithContext('Catalog item updated successfully', {
        id: saved.id,
      });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to update catalog item',
        error,
        context: { id, dto },
      });
      throw error;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      this.logger.infoWithContext('Soft deleting catalog item', { id });
      await this.repo.update(id, { active: false });
      this.logger.infoWithContext('Catalog item soft deleted', { id });
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to soft delete catalog item',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async decrementStock(itemId: string, qty: number): Promise<CatalogItem> {
    try {
      const item = await this.findOne(itemId);
      if (item.type !== ItemType.PRODUCT) {
        this.logger.warnWithContext(
          'Attempted to decrement stock for non-product',
          { itemId, type: item.type },
        );
        return item;
      }
      if (item.stock < qty) {
        this.logger.warnWithContext('Insufficient stock', {
          itemId,
          itemName: item.name,
          requested: qty,
          available: item.stock,
        });
        throw new BadRequestException(
          `Stock insuficiente para "${item.name}" (disponible: ${item.stock})`,
        );
      }
      item.stock -= qty;
      const saved = await this.repo.save(item);
      this.logger.infoWithContext('Stock decremented successfully', {
        itemId,
        itemName: item.name,
        previousStock: item.stock + qty,
        newStock: item.stock,
        decremented: qty,
      });
      this.eventEmitter.emit('inventory.changed', {
        productId: item.id,
        stockAfter: item.stock,
      });
      return saved;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      this.logger.errorWithContext({
        message: 'Failed to decrement stock',
        error,
        context: { itemId, qty },
      });
      throw error;
    }
  }

  async incrementStock(itemId: string, qty: number): Promise<CatalogItem> {
    try {
      const item = await this.findOne(itemId);
      if (item.type !== ItemType.PRODUCT) {
        this.logger.warnWithContext(
          'Attempted to increment stock for non-product',
          { itemId, type: item.type },
        );
        return item;
      }
      item.stock += qty;
      const saved = await this.repo.save(item);
      this.logger.infoWithContext('Stock incremented successfully', {
        itemId,
        itemName: item.name,
        previousStock: item.stock - qty,
        newStock: item.stock,
        incremented: qty,
      });
      this.eventEmitter.emit('inventory.changed', {
        productId: item.id,
        stockAfter: item.stock,
      });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to increment stock',
        error,
        context: { itemId, qty },
      });
      throw error;
    }
  }
}
