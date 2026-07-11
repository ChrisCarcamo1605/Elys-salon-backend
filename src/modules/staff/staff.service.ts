import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import { User } from './entities/user.entity';
import { Role, UserStatus } from '../../common/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class StaffService {
  private readonly logger = new AppLogger(StaffService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService<AppConfig>,
  ) {}

  /** Nunca exponer hashes al cliente; expone `hasPassword` para saber si ya tiene login por correo. */
  sanitize(user: User) {
    const { pinHash, passwordHash, ...safe } = user;
    return { ...safe, hasPassword: !!passwordHash };
  }

  private getArgon2Options() {
    return {
      type: argon2.argon2id,
      memoryCost:
        this.config.get<number>('argon2.memory', { infer: true }) ?? 65536,
      timeCost: this.config.get<number>('argon2.time', { infer: true }) ?? 3,
    };
  }

  async create(dto: CreateUserDto): Promise<User> {
    try {
      this.logger.infoWithContext('Creating new user', {
        name: dto.name,
        role: dto.role,
        pin: dto.pin,
      });

      const pepper = this.config.get('pinPepper', { infer: true });

      await this.ensurePinUnique(dto.pin);

      const pinHash = (await argon2.hash(
        dto.pin + pepper,
        this.getArgon2Options() as any,
      )) as unknown as string;

      const user = this.userRepo.create({
        ...dto,
        pinHash,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      });
      const saved = await this.userRepo.save(user);

      this.logger.infoWithContext('User created successfully', {
        id: saved.id,
        name: saved.name,
      });
      return saved;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to create user',
        error,
        context: { dto },
      });
      throw error;
    }
  }

  async findAll(query?: {
    role?: Role;
    status?: UserStatus;
    search?: string;
    branchId?: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      const page = query?.page ?? 1;
      const pageSize = query?.pageSize ?? 50;
      const qb = this.userRepo
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.branch', 'branch')
        .where('u.status != :inactiva', { inactiva: UserStatus.INACTIVA });

      if (query?.role) qb.andWhere('u.role = :role', { role: query.role });
      if (query?.status)
        qb.andWhere('u.status = :status', { status: query.status });
      if (query?.search)
        qb.andWhere('u.name ILIKE :search', { search: `%${query.search}%` });
      if (query?.branchId)
        qb.andWhere('u.branchId = :branchId', { branchId: query.branchId });

      const [items, total] = await qb
        .orderBy('u.name')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();

      this.logger.infoWithContext('Users retrieved', {
        count: items.length,
        total,
        page,
        pageSize,
      });
      return {
        items: items.map((u) => this.sanitize(u)),
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve users',
        error,
        context: { query },
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const user = await this.userRepo.findOne({
        where: { id },
        relations: ['branch'],
      });
      if (!user) {
        this.logger.errorWithContext({
          message: 'User not found',
          context: { id },
        });
        throw new NotFoundException(`Usuaria no encontrada (ID: ${id})`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to retrieve user',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      this.logger.infoWithContext('Updating user', {
        id,
        changes: Object.keys(dto),
      });
      const user = await this.findOne(id);
      Object.assign(user, dto);
      if (dto.hireDate) user.hireDate = new Date(dto.hireDate);
      if (dto.birthday) user.birthday = new Date(dto.birthday);
      // `findOne` precarga la relación `branch`. Si queda presente (aunque sea
      // null), TypeORM la usa para resolver branch_id al guardar e ignora el
      // branchId escalar recién asignado. Hay que eliminarla (no ponerla en
      // null, eso fuerza branch_id=NULL) para que gane el valor de `dto`.
      if ('branchId' in dto) {
        delete (user as { branch?: unknown }).branch;
      }
      const saved = await this.userRepo.save(user);
      this.logger.infoWithContext('User updated successfully', { id });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to update user',
        error,
        context: { id, dto },
      });
      throw error;
    }
  }

  async updatePin(id: string, pin: string): Promise<void> {
    try {
      this.logger.infoWithContext('Updating user PIN', { id });
      await this.ensurePinUnique(pin, id);
      const pepper = this.config.get('pinPepper', { infer: true });
      const pinHash = (await argon2.hash(
        pin + pepper,
        this.getArgon2Options() as any,
      )) as unknown as string;
      await this.userRepo.update(id, { pinHash });
      if (process.env.NODE_ENV !== 'production') {
        await this.userRepo.update(id, { devPin: pin });
      }
      this.logger.infoWithContext('User PIN updated successfully', { id });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to update user PIN',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async updatePassword(id: string, password: string): Promise<void> {
    try {
      this.logger.infoWithContext('Updating user password', { id });
      const user = await this.findOne(id);
      if (!user.email) {
        throw new BadRequestException(
          'La cuenta necesita un correo antes de asignar contraseña',
        );
      }

      const pepper = this.config.get('pinPepper', { infer: true });
      const passwordHash = (await argon2.hash(
        password + pepper,
        this.getArgon2Options() as any,
      )) as unknown as string;
      await this.userRepo.update(id, { passwordHash });
      this.logger.infoWithContext('User password updated successfully', {
        id,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.errorWithContext({
        message: 'Failed to update user password',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      this.logger.infoWithContext('Soft deleting user', { id });
      await this.userRepo.update(id, { status: UserStatus.INACTIVA });
      this.logger.infoWithContext('User soft deleted successfully', { id });
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to soft delete user',
        error,
        context: { id },
      });
      throw error;
    }
  }

  async updatePermissions(
    id: string,
    dto: UpdatePermissionsDto,
  ): Promise<User> {
    try {
      this.logger.infoWithContext('Updating user permissions', {
        id,
        role: dto.role,
        permissionsCount: dto.permissions
          ? Object.keys(dto.permissions).length
          : 0,
      });
      const user = await this.findOne(id);

      if (dto.role && dto.role !== user.role) {
        this.logger.infoWithContext('User role changed', {
          id,
          oldRole: user.role,
          newRole: dto.role,
        });
        user.role = dto.role;
        user.permissions = {};
      }

      if (dto.permissions) {
        user.permissions = dto.permissions;
      }

      const saved = await this.userRepo.save(user);
      this.logger.infoWithContext('User permissions updated successfully', {
        id,
      });
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to update user permissions',
        error,
        context: { id, dto },
      });
      throw error;
    }
  }

  async findPublicHints() {
    try {
      const isProd = process.env.NODE_ENV === 'production';
      const selectFields: (keyof User)[] = ['id', 'name', 'role', 'initials', 'color', 'avatarHue'];
      if (!isProd) selectFields.push('devPin');
      const result = await this.userRepo.find({
        where: { status: UserStatus.ACTIVA },
        select: selectFields,
        order: { name: 'ASC' },
      });
      this.logger.infoWithContext('Public hints retrieved', {
        count: result.length,
        devPins: result.map((u) => ({ name: u.name, devPin: u.devPin ?? null })),
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve public hints',
        error,
      });
      throw error;
    }
  }

  private async ensurePinUnique(
    pin: string,
    excludeId?: string,
  ): Promise<void> {
    try {
      const pepper = this.config.get('pinPepper', { infer: true });
      const activeUsers = await this.userRepo
        .createQueryBuilder('u')
        .where('u.status != :inactiva', { inactiva: UserStatus.INACTIVA })
        .getMany();

      for (const u of activeUsers) {
        if (excludeId && u.id === excludeId) continue;
        const match = await argon2.verify(
          u.pinHash,
          pin + pepper,
          this.getArgon2Options() as any,
        );
        if (match) {
          this.logger.warnWithContext('Duplicate PIN detected', {
            pin,
            existingUserId: u.id,
            existingUserName: u.name,
            excludeId,
          });
          throw new ConflictException('PIN ya está en uso por otra usuaria');
        }
      }
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to verify PIN uniqueness',
        error,
        context: { excludeId },
      });
      throw error;
    }
  }
}
