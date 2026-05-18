import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class PromotionsService {
  private readonly logger = new AppLogger(PromotionsService.name);

  constructor(
    @InjectRepository(Promotion) private repo: Repository<Promotion>,
    @InjectRepository(CatalogItem) private itemRepo: Repository<CatalogItem>,
  ) {}

  async findAll(active?: boolean) {
    try {
      const qb = this.repo.createQueryBuilder('p').orderBy('p.name');
      if (active !== undefined) qb.where('p.active = :active', { active });
      const result = await qb.getMany();
      this.logger.infoWithContext('Promotions retrieved', {
        count: result.length,
        active,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve promotions',
        error,
        context: { active },
      });
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const promo = await this.repo.findOne({ where: { id }, relations: ['items'] });
      if (!promo) {
        this.logger.errorWithContext({
          message: 'Promotion not found',
          context: { id },
        });
        throw new NotFoundException(`Promoción no encontrada (ID: ${id})`);
      }
      return promo;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to retrieve promotion',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async create(dto: CreatePromotionDto) {
    try {
      this.logger.infoWithContext('Creating promotion', {
        name: dto.name,
        active: dto.active,
      });
      const { itemIds, ...rest } = dto;
      const promo = this.repo.create(rest);
      if (itemIds && itemIds.length > 0) {
        promo.items = await this.itemRepo.findBy({ id: In(itemIds) });
      } else {
        promo.items = [];
      }
      const saved = await this.repo.save(promo);
      this.logger.infoWithContext('Promotion created successfully', {
        id: saved.id,
        name: saved.name,
      });
      return saved;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to create promotion',
        error,
        context: { dto },
      });
      throw error;
    }
  }

  async update(id: string, dto: UpdatePromotionDto) {
    try {
      this.logger.infoWithContext('Updating promotion', {
        id,
        changes: Object.keys(dto),
      });
      const promo = await this.findOne(id);
      const { itemIds, ...rest } = dto;
      Object.assign(promo, rest);
      if (itemIds !== undefined) {
        if (itemIds && itemIds.length > 0) {
          promo.items = await this.itemRepo.findBy({ id: In(itemIds) });
        } else {
          promo.items = [];
        }
      }
      const saved = await this.repo.save(promo);
      this.logger.infoWithContext('Promotion updated successfully', { id });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to update promotion',
        error,
        context: { id, dto },
      });
      throw error;
    }
  }

  async remove(id: string) {
    try {
      this.logger.infoWithContext('Soft deleting promotion', { id });
      await this.repo.update(id, { active: false });
      this.logger.infoWithContext('Promotion soft deleted', { id });
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to soft delete promotion',
        error,
        context: { id },
      });
      throw error;
    }
  }
}
