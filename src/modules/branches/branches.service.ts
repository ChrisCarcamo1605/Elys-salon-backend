import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(@InjectRepository(Branch) private repo: Repository<Branch>) {}

  async create(dto: CreateBranchDto): Promise<Branch> {
    return this.repo.save(this.repo.create(dto));
  }

  /** Sin `branchId`: todas las sucursales. Con `branchId`: solo esa (para el scope de no-admin). */
  async findAll(branchId?: string): Promise<Branch[]> {
    if (branchId) {
      const branch = await this.repo.findOne({ where: { id: branchId } });
      return branch ? [branch] : [];
    }
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.repo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);
    Object.assign(branch, dto);
    return this.repo.save(branch);
  }
}
