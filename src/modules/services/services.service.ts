import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesDto } from './dto/list-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SalonService } from './entities/salon-service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(SalonService)
    private readonly servicesRepo: Repository<SalonService>,
  ) {}

  async create(dto: CreateServiceDto): Promise<SalonService> {
    const service = this.servicesRepo.create({
      name: dto.name.trim(),
      description: dto.description ?? null,
      categoryId: dto.categoryId ?? null,
      basePrice: dto.basePrice,
      durationMin: dto.durationMin ?? 30,
      active: dto.active ?? true,
    });
    return this.servicesRepo.save(service);
  }

  async list(
    query: ListServicesDto,
  ): Promise<{ items: SalonService[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, categoryId, active, search } = query;

    const qb = this.servicesRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.category', 'category')
      .orderBy('s.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (categoryId) qb.andWhere('s.categoryId = :categoryId', { categoryId });
    if (typeof active === 'boolean') qb.andWhere('s.active = :active', { active });
    if (search) {
      qb.andWhere('s.name ILIKE :s', { s: `%${search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findById(id: string): Promise<SalonService> {
    const service = await this.servicesRepo.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!service) throw new NotFoundException(`Servicio ${id} no encontrado`);
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<SalonService> {
    const service = await this.findById(id);

    if (typeof dto.name === 'string') service.name = dto.name.trim();
    if (typeof dto.description === 'string') service.description = dto.description;
    if (typeof dto.categoryId !== 'undefined') service.categoryId = dto.categoryId ?? null;
    if (typeof dto.basePrice === 'number') service.basePrice = dto.basePrice;
    if (typeof dto.durationMin === 'number') service.durationMin = dto.durationMin;
    if (typeof dto.active === 'boolean') service.active = dto.active;

    await this.servicesRepo.save(service);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.servicesRepo.softDelete({ id });
  }

  async restore(id: string): Promise<SalonService> {
    const service = await this.servicesRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!service) throw new NotFoundException(`Servicio ${id} no encontrado`);
    await this.servicesRepo.restore({ id });
    return this.findById(id);
  }
}
