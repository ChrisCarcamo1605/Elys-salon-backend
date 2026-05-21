import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionsMatrix } from './entities/permissions-matrix.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionsMatrix)
    private repo: Repository<PermissionsMatrix>,
  ) {}

  async getMatrix(): Promise<PermissionsMatrix[]> {
    return this.repo.find({ order: { perm: 'ASC' } });
  }

  async upsertMatrix(
    rows: { perm: string; admin: boolean; empleado: boolean }[],
  ): Promise<PermissionsMatrix[]> {
    for (const row of rows) {
      await this.repo.save({
        perm: row.perm,
        admin: row.admin,
        empleado: row.empleado,
      });
    }
    return this.repo.find({ order: { perm: 'ASC' } });
  }

  async getDefaultForRole(
    role: 'admin' | 'empleado',
  ): Promise<Record<string, boolean>> {
    const matrix = await this.repo.find();
    const result: Record<string, boolean> = {};
    for (const row of matrix) {
      result[row.perm] = role === 'admin' ? row.admin : row.empleado;
    }
    return result;
  }

  async hasPermission(
    user: { role: string; permissions: Record<string, boolean> },
    perm: string,
  ): Promise<boolean> {
    const defaults = await this.getDefaultForRole(
      user.role as 'admin' | 'empleado',
    );
    const overridden = user.permissions?.[perm];
    if (overridden !== undefined) return overridden;
    return defaults[perm] ?? false;
  }
}
