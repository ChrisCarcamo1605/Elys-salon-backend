import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ProductCategory } from './entities/product-category.entity';
import { ServiceCategory } from './entities/service-category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly productCatRepo: Repository<ProductCategory>,
    @InjectRepository(ServiceCategory)
    private readonly serviceCatRepo: Repository<ServiceCategory>,
  ) {}

  // ── Product categories ──────────────────────────────────────────────

  async createProductCategory(dto: CreateCategoryDto): Promise<ProductCategory> {
    await this.assertUniqueName(this.productCatRepo, dto.name);
    const entity = this.productCatRepo.create({
      name: dto.name.trim(),
      active: dto.active ?? true,
    });
    return this.productCatRepo.save(entity);
  }

  async listProductCategories(
    query: ListCategoriesDto,
  ): Promise<{ items: ProductCategory[]; total: number; page: number; limit: number }> {
    return this.list(this.productCatRepo, query);
  }

  async findProductCategoryById(id: string): Promise<ProductCategory> {
    return this.findById(this.productCatRepo, id, 'Categoría de producto');
  }

  async updateProductCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<ProductCategory> {
    const cat = await this.findProductCategoryById(id);
    if (dto.name && dto.name !== cat.name) {
      await this.assertUniqueName(this.productCatRepo, dto.name);
    }
    Object.assign(cat, dto);
    return this.productCatRepo.save(cat);
  }

  async deleteProductCategory(id: string): Promise<void> {
    await this.findProductCategoryById(id);
    await this.productCatRepo.delete({ id });
  }

  // ── Service categories ──────────────────────────────────────────────

  async createServiceCategory(dto: CreateCategoryDto): Promise<ServiceCategory> {
    await this.assertUniqueName(this.serviceCatRepo, dto.name);
    const entity = this.serviceCatRepo.create({
      name: dto.name.trim(),
      active: dto.active ?? true,
    });
    return this.serviceCatRepo.save(entity);
  }

  async listServiceCategories(
    query: ListCategoriesDto,
  ): Promise<{ items: ServiceCategory[]; total: number; page: number; limit: number }> {
    return this.list(this.serviceCatRepo, query);
  }

  async findServiceCategoryById(id: string): Promise<ServiceCategory> {
    return this.findById(this.serviceCatRepo, id, 'Categoría de servicio');
  }

  async updateServiceCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<ServiceCategory> {
    const cat = await this.findServiceCategoryById(id);
    if (dto.name && dto.name !== cat.name) {
      await this.assertUniqueName(this.serviceCatRepo, dto.name);
    }
    Object.assign(cat, dto);
    return this.serviceCatRepo.save(cat);
  }

  async deleteServiceCategory(id: string): Promise<void> {
    await this.findServiceCategoryById(id);
    await this.serviceCatRepo.delete({ id });
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private async assertUniqueName<T extends { name: string }>(
    repo: Repository<T>,
    name: string,
  ): Promise<void> {
    const existing = await repo.findOne({
      where: { name } as FindOptionsWhere<T>,
    });
    if (existing) {
      throw new ConflictException(`Categoría '${name}' ya existe`);
    }
  }

  private async list<T extends { active: boolean }>(
    repo: Repository<T>,
    query: ListCategoriesDto,
  ): Promise<{ items: T[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 50, active } = query;
    const where: FindOptionsWhere<T> =
      typeof active === 'boolean' ? ({ active } as FindOptionsWhere<T>) : {};

    const [items, total] = await repo.findAndCount({
      where,
      order: { name: 'ASC' } as never,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  private async findById<T extends { id: string }>(
    repo: Repository<T>,
    id: string,
    label: string,
  ): Promise<T> {
    const entity = await repo.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
    if (!entity) throw new NotFoundException(`${label} ${id} no encontrada`);
    return entity;
  }
}
