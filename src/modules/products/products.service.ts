import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productsRepo.findOne({
      where: { sku: dto.sku },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(`SKU '${dto.sku}' ya está registrado`);
    }

    const product = this.productsRepo.create({
      sku: dto.sku.toUpperCase().trim(),
      name: dto.name.trim(),
      description: dto.description ?? null,
      categoryId: dto.categoryId ?? null,
      salePrice: dto.salePrice,
      costPrice: dto.costPrice ?? 0,
      stock: dto.stock ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? 5,
      active: dto.active ?? true,
    });

    return this.productsRepo.save(product);
  }

  async list(
    query: ListProductsDto,
  ): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, categoryId, active, search, lowStock } = query;

    const qb = this.productsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .orderBy('p.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (typeof active === 'boolean') qb.andWhere('p.active = :active', { active });
    if (search) {
      qb.andWhere('(p.name ILIKE :s OR p.sku ILIKE :s)', { s: `%${search}%` });
    }
    if (lowStock) {
      qb.andWhere('p.stock < p.lowStockThreshold');
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productsRepo.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);

    if (dto.sku && dto.sku !== product.sku) {
      const conflict = await this.productsRepo.findOne({
        where: { sku: dto.sku },
        withDeleted: true,
      });
      if (conflict) throw new ConflictException(`SKU '${dto.sku}' ya está en uso`);
      product.sku = dto.sku.toUpperCase().trim();
    }

    if (typeof dto.name === 'string') product.name = dto.name.trim();
    if (typeof dto.description === 'string') product.description = dto.description;
    if (typeof dto.categoryId !== 'undefined') product.categoryId = dto.categoryId ?? null;
    if (typeof dto.salePrice === 'number') product.salePrice = dto.salePrice;
    if (typeof dto.costPrice === 'number') product.costPrice = dto.costPrice;
    if (typeof dto.stock === 'number') product.stock = dto.stock;
    if (typeof dto.lowStockThreshold === 'number') product.lowStockThreshold = dto.lowStockThreshold;
    if (typeof dto.active === 'boolean') product.active = dto.active;

    await this.productsRepo.save(product);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.productsRepo.softDelete({ id });
  }

  async restore(id: string): Promise<Product> {
    const product = await this.productsRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    await this.productsRepo.restore({ id });
    return this.findById(id);
  }
}
