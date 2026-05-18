import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService<AppConfig>,
  ) {}

  private getArgon2Options() {
    return {
      type: argon2.argon2id,
      memoryCost: this.config.get<number>('argon2.memory', { infer: true }) ?? 65536,
      timeCost: this.config.get<number>('argon2.time', { infer: true }) ?? 3,
    };
  }

  async create(dto: CreateUserDto): Promise<User> {
    const pepper = this.config.get('pinPepper', { infer: true });

    await this.ensurePinUnique(dto.pin);

    const pinHash = (await argon2.hash(dto.pin + pepper, this.getArgon2Options() as any)) as unknown as string;

    const user = this.userRepo.create({
      ...dto,
      pinHash,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      birthday: dto.birthday ? new Date(dto.birthday) : undefined,
    });
    return this.userRepo.save(user) as Promise<User>;
  }

  async findAll(query?: { role?: Role; status?: UserStatus; search?: string; page?: number; pageSize?: number }) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 50;
    const qb = this.userRepo.createQueryBuilder('u')
      .where('u.status != :inactiva', { inactiva: UserStatus.INACTIVA });

    if (query?.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query?.status) qb.andWhere('u.status = :status', { status: query.status });
    if (query?.search) qb.andWhere('u.name ILIKE :search', { search: `%${query.search}%` });

    const [items, total] = await qb
      .orderBy('u.name')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuaria no encontrada');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    if (dto.hireDate) user.hireDate = new Date(dto.hireDate);
    if (dto.birthday) user.birthday = new Date(dto.birthday);
    return this.userRepo.save(user);
  }

  async updatePin(id: string, pin: string): Promise<void> {
    await this.ensurePinUnique(pin, id);
    const pepper = this.config.get('pinPepper', { infer: true });
    const pinHash = (await argon2.hash(pin + pepper, this.getArgon2Options() as any)) as unknown as string;
    await this.userRepo.update(id, { pinHash });
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepo.update(id, { status: UserStatus.INACTIVA });
  }

  async updatePermissions(id: string, dto: UpdatePermissionsDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.role && dto.role !== user.role) {
      user.role = dto.role;
      user.permissions = {};
    }

    if (dto.permissions) {
      user.permissions = dto.permissions;
    }

    return this.userRepo.save(user);
  }

  async findPublicHints() {
    return this.userRepo.find({
      where: { status: UserStatus.ACTIVA },
      select: ['id', 'name', 'initials', 'color'],
      order: { name: 'ASC' },
    });
  }

  private async ensurePinUnique(pin: string, excludeId?: string): Promise<void> {
    const pepper = this.config.get('pinPepper', { infer: true });
    const activeUsers = await this.userRepo
      .createQueryBuilder('u')
      .where('u.status != :inactiva', { inactiva: UserStatus.INACTIVA })
      .getMany();

    for (const u of activeUsers) {
      if (excludeId && u.id === excludeId) continue;
      const match = await argon2.verify(u.pinHash, pin + pepper, this.getArgon2Options() as any) as boolean;
      if (match) {
        throw new ConflictException('PIN ya está en uso por otra usuaria');
      }
    }
  }
}