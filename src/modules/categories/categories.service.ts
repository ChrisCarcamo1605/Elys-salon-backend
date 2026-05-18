import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(): Promise<Category[]> {
    return this.repo.find({ order: { ordering: 'ASC' } });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: string): Promise<void> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    // Soft delete: remove only if no items reference it
    await this.repo.delete(id);
  }
}
