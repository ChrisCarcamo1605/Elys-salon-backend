import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import { Session } from './entities/session.entity';
import { User } from '../staff/entities/user.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';
import { Role, UserStatus, SaleStatus, ItemType } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user.type';

export interface MonthStats {
  totalSales: number;
  retailSales: number;
  servicesDone: number;
  newClients: number;
  tipsCollected: number;
}

@Injectable()
export class AuthService {
  private loginAttempts = new Map<string, { count: number; blockedUntil: Date | null }>();

  constructor(
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine) private lineRepo: Repository<SaleLine>,
    private jwtService: JwtService,
    private config: ConfigService<AppConfig>,
  ) {}

  async unlock(pin: string, ip: string, userAgent: string) {
    const key = ip;
    const attempt = this.loginAttempts.get(key);

    if (attempt && attempt.blockedUntil && attempt.blockedUntil > new Date()) {
      const remaining = Math.ceil((attempt.blockedUntil.getTime() - Date.now()) / 60000);
      throw new HttpException(`Demasiados intentos. Intenta de nuevo en ${remaining} minutos.`, HttpStatus.TOO_MANY_REQUESTS);
    }

    const pepper = this.config.get('pinPepper', { infer: true });
    const argon2Opts: any = {
      type: argon2.argon2id,
      memoryCost: this.config.get<number>('argon2.memory', { infer: true }) ?? 65536,
      timeCost: this.config.get<number>('argon2.time', { infer: true }) ?? 3,
    };

    const users = await this.userRepo.find({ where: { status: UserStatus.ACTIVA } });

    let matched: User | null = null;
    for (const user of users) {
      const valid = await argon2.verify(user.pinHash, pin + pepper, argon2Opts);
      if (valid) {
        matched = user;
        break;
      }
    }

    if (!matched) {
      const current = this.loginAttempts.get(key) ?? { count: 0, blockedUntil: null };
      current.count += 1;

      const limit = this.config.get<number>('throttle.loginLimit', { infer: true }) ?? 5;
      const blockMin = this.config.get<number>('throttle.loginBlockMin', { infer: true }) ?? 5;

      if (current.count >= limit) {
        current.blockedUntil = new Date(Date.now() + blockMin * 60 * 1000);
        current.count = 0;
      }

      this.loginAttempts.set(key, current);

      if (current.blockedUntil) {
        throw new HttpException('Demasiados intentos. Bloqueado temporalmente.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new UnauthorizedException('PIN incorrecto');
    }

    this.loginAttempts.delete(key);

    const payload = { sub: matched.id, role: matched.role };
    const token = this.jwtService.sign(payload);
    const tokenHash = (await argon2.hash(token, argon2Opts)) as unknown as string;

    const session = this.sessionRepo.create({
      userId: matched.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      ip,
      userAgent,
    });
    await this.sessionRepo.save(session);

    const { pinHash, permissions: userOverrides, ...rest } = matched;
    const monthStats = await this.computeMonthStats(matched.id);

    return {
      token,
      expiresAt: session.expiresAt,
      user: rest,
      monthStats,
    };
  }

  async lock(userId: string, token: string) {
    const argon2Opts: any = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 };
    const sessions = await this.sessionRepo.find({ where: { userId } });
    for (const s of sessions) {
      if (await argon2.verify(s.tokenHash, token, argon2Opts)) {
        s.revokedAt = new Date();
        await this.sessionRepo.save(s);
      }
    }
    return { ok: true };
  }

  async validateUser(userId: string): Promise<AuthUser | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVA) return null;
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      permissions: user.permissions ?? {},
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { pinHash, ...rest } = user;
    return rest;
  }

  private async computeMonthStats(userId: string): Promise<MonthStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const sales = await this.saleRepo.find({
      where: {
        employeeId: userId,
        status: SaleStatus.COMPLETED,
        createdAt: Between(startOfMonth, endOfMonth),
      },
    });

    let totalSales = 0;
    let tipsCollected = 0;
    let newClients = 0;

    for (const s of sales) {
      totalSales += Number(s.total);
      tipsCollected += Number(s.tip);
      if (s.customerIsNew) newClients++;
    }

    const saleIds = sales.map(s => s.id);
    let servicesDone = 0;
    let retailSales = 0;

    if (saleIds.length > 0) {
      const lines = await this.lineRepo.createQueryBuilder('l')
        .where('l.saleId IN (:...ids)', { ids: saleIds })
        .getMany();

      for (const l of lines) {
        if (l.itemType === ItemType.SERVICE) servicesDone += l.qty;
        if (l.itemType === ItemType.PRODUCT) retailSales += Number(l.price) * l.qty;
      }
    }

    return { totalSales, retailSales, servicesDone, newClients, tipsCollected };
  }
}