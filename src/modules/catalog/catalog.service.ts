import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogItem } from './entities/catalog-item.entity';
import { Category } from '../categories/entities/category.entity';
import { ItemType } from '../../common/enums';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(CatalogItem) private repo: Repository<CatalogItem>,
    @InjectRepository(Category) private catRepo: Repository<Category>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(type?: ItemType, categoryId?: string, active?: boolean) {
    const qb = this.repo.createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .orderBy('item.name');

    if (type) qb.andWhere('item.type = :type', { type });
    if (categoryId) qb.andWhere('item.categoryId = :categoryId', { categoryId });
    if (active !== undefined) qb.andWhere('item.active = :active', { active });

    return qb.getMany();
  }

  async getCatalog() {
    const [categories, items] = await Promise.all([
      this.catRepo.find({ order: { ordering: 'ASC' } }),
      this.repo.find({ where: { active: true }, relations: ['category'], order: { name: 'ASC' } }),
    ]);
    return { categories, items };
  }

  async findOne(id: string): Promise<CatalogItem> {
    const item = await this.repo.findOne({ where: { id }, relations: ['category'] });
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }

  async create(dto: CreateCatalogItemDto): Promise<CatalogItem> {
    const item = this.repo.create(dto);
    const saved = await this.repo.save(item);
    return saved;
  }

  async update(id: string, dto: UpdateCatalogItemDto): Promise<CatalogItem> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  async decrementStock(itemId: string, qty: number): Promise<CatalogItem> {
    const item = await this.findOne(itemId);
    if (item.type !== ItemType.PRODUCT) return item;
    if (item.stock < qty) {
      throw new BadRequestException(`Stock insuficiente para "${item.name}" (disponible: ${item.stock})`);
    }
    item.stock -= qty;
    const saved = await this.repo.save(item);
    this.eventEmitter.emit('inventory.changed', { productId: item.id, stockAfter: item.stock });
    return saved;
  }

  async incrementStock(itemId: string, qty: number): Promise<CatalogItem> {
    const item = await this.findOne(itemId);
    if (item.type !== ItemType.PRODUCT) return item;
    item.stock += qty;
    const saved = await this.repo.save(item);
    this.eventEmitter.emit('inventory.changed', { productId: item.id, stockAfter: item.stock });
    return saved;
  }
}