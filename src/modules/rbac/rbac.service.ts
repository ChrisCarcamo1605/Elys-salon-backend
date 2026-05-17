import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleName } from '../../common/enums';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role) private readonly rolesRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepo: Repository<Permission>,
  ) {}

  listRoles(): Promise<Role[]> {
    return this.rolesRepo.find({
      relations: { permissions: true },
      order: { level: 'DESC' },
    });
  }

  listPermissions(): Promise<Permission[]> {
    return this.permissionsRepo.find({ order: { code: 'ASC' } });
  }

  async findRoleByName(name: RoleName): Promise<Role> {
    const role = await this.rolesRepo.findOne({
      where: { name },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException(`Rol '${name}' no encontrado`);
    }
    return role;
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.rolesRepo.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException(`Rol ${id} no encontrado`);
    }
    return role;
  }

  async updateRolePermissions(
    roleId: string,
    permissionCodes: string[],
  ): Promise<Role> {
    const role = await this.findRoleById(roleId);
    if (role.name === RoleName.SYSTEM) {
      role.permissions = await this.permissionsRepo.find();
      return this.rolesRepo.save(role);
    }
    const permissions = await this.permissionsRepo.find({
      where: { code: In(permissionCodes) },
    });
    role.permissions = permissions;
    return this.rolesRepo.save(role);
  }

  async findPermissionByCode(code: string): Promise<Permission> {
    const perm = await this.permissionsRepo.findOne({ where: { code } });
    if (!perm) {
      throw new NotFoundException(`Permiso '${code}' no encontrado`);
    }
    return perm;
  }
}
