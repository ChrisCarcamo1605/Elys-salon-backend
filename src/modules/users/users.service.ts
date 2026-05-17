import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import { RoleName } from '../../common/enums';
import { UserPermission } from '../rbac/entities/user-permission.entity';
import { RbacService } from '../rbac/rbac.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserPermission)
    private readonly userPermsRepo: Repository<UserPermission>,
    private readonly rbac: RbacService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(`Email '${dto.email}' ya está registrado`);
    }

    const role = await this.rbac.findRoleByName(dto.role);
    const cost = this.config.get('bcryptCost', { infer: true });
    const passwordHash = await bcrypt.hash(dto.password, cost);

    const user = this.usersRepo.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      fullName: dto.fullName.trim(),
      roleId: role.id,
      active: dto.active ?? true,
    });

    const saved = await this.usersRepo.save(user);
    return this.findById(saved.id);
  }

  async list(
    query: ListUsersDto,
  ): Promise<{ items: User[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, role, active, search } = query;
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (role) qb.andWhere('role.name = :role', { role });
    if (typeof active === 'boolean')
      qb.andWhere('user.active = :active', { active });
    if (search) {
      qb.andWhere('(user.email ILIKE :s OR user.fullName ILIKE :s)', {
        s: `%${search}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: {
        role: { permissions: true },
        userPermissions: { permission: true },
      },
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return user;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'rolePerm')
      .leftJoinAndSelect('user.userPermissions', 'userPerm')
      .leftJoinAndSelect('userPerm.permission', 'extraPerm')
      .where('user.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.role) {
      const role = await this.rbac.findRoleByName(dto.role);
      user.roleId = role.id;
    }
    if (typeof dto.fullName === 'string') user.fullName = dto.fullName.trim();
    if (typeof dto.active === 'boolean') user.active = dto.active;

    await this.usersRepo.save(user);
    return this.findById(id);
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user.role.name === RoleName.SYSTEM) {
      throw new BadRequestException('No se puede desactivar al usuario system');
    }
    user.active = false;
    await this.usersRepo.save(user);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const cost = this.config.get('bcryptCost', { infer: true });
    const passwordHash = await bcrypt.hash(newPassword, cost);
    await this.usersRepo.update({ id }, { passwordHash });
  }

  async grantPermission(
    userId: string,
    permissionCode: string,
    grantedById: string,
  ): Promise<UserPermission> {
    const user = await this.findById(userId);
    const permission = await this.rbac.findPermissionByCode(permissionCode);

    const existing = await this.userPermsRepo.findOne({
      where: { userId: user.id, permissionId: permission.id },
    });
    if (existing) {
      return existing;
    }

    const up = this.userPermsRepo.create({
      userId: user.id,
      permissionId: permission.id,
      grantedBy: { id: grantedById } as User,
    });
    return this.userPermsRepo.save(up);
  }

  async revokePermission(userId: string, permissionId: string): Promise<void> {
    const result = await this.userPermsRepo.delete({ userId, permissionId });
    if (result.affected === 0) {
      throw new NotFoundException(
        'Permiso especial no encontrado para este usuario',
      );
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepo.update({ id: userId }, { lastLoginAt: new Date() });
  }

  computeEffectivePermissions(user: User): string[] {
    const rolePerms = user.role?.permissions?.map((p) => p.code) ?? [];
    const extraPerms =
      user.userPermissions?.map((up) => up.permission.code) ?? [];
    return Array.from(new Set([...rolePerms, ...extraPerms]));
  }
}
