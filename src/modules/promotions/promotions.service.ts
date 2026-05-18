import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(@InjectRepository(Promotion) private repo: Repository<Promotion>) {}

  async findAll(active?: boolean) {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.name');
    if (active !== undefined) qb.where('p.active = :active', { active });
    return qb.getMany();
  }

  async findOne(id: string) {
    const promo = await this.repo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');
    return promo;
  }

  async create(dto: CreatePromotionDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const promo = await this.findOne(id);
    Object.assign(promo, dto);
    return this.repo.save(promo);
  }

  async remove(id: string) {
    await this.repo.update(id, { active: false });
  }
}