import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, IsNull, ILike } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import { Session } from './entities/session.entity';
import { DeviceToken } from './entities/device-token.entity';
import { User } from '../staff/entities/user.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';
import { Role, UserStatus, SaleStatus, ItemType } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user.type';

const DEVICE_TOKEN_DAYS = 30;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface MonthStats {
  totalSales: number;
  retailSales: number;
  servicesDone: number;
  newClients: number;
  tipsCollected: number;
}

@Injectable()
export class AuthService {
  private loginAttempts = new Map<
    string,
    { count: number; blockedUntil: Date | null }
  >();

  constructor(
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(DeviceToken)
    private deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine) private lineRepo: Repository<SaleLine>,
    private jwtService: JwtService,
    private config: ConfigService<AppConfig>,
  ) {}

  // ─── Rate limiting helpers ────────────────────────────────────────────────

  private checkRateLimit(key: string): void {
    const attempt = this.loginAttempts.get(key);
    if (attempt?.blockedUntil && attempt.blockedUntil > new Date()) {
      const remaining = Math.ceil(
        (attempt.blockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new HttpException(
        `Demasiados intentos. Intenta de nuevo en ${remaining} minutos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedAttempt(key: string): void {
    const current = this.loginAttempts.get(key) ?? {
      count: 0,
      blockedUntil: null,
    };
    current.count += 1;

    const limit =
      this.config.get<number>('throttle.loginLimit', { infer: true }) ?? 5;
    const blockMin =
      this.config.get<number>('throttle.loginBlockMin', { infer: true }) ?? 5;

    if (current.count >= limit) {
      current.blockedUntil = new Date(Date.now() + blockMin * 60 * 1000);
      current.count = 0;
      this.loginAttempts.set(key, current);
      throw new HttpException(
        'Demasiados intentos. Bloqueado temporalmente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.loginAttempts.set(key, current);
  }

  private clearRateLimit(key: string): void {
    this.loginAttempts.delete(key);
  }

  private getArgon2Opts(): argon2.Options {
    return {
      type: argon2.argon2id,
      memoryCost:
        this.config.get<number>('argon2.memory', { infer: true }) ?? 65536,
      timeCost: this.config.get<number>('argon2.time', { infer: true }) ?? 3,
    };
  }

  // ─── Session helper ───────────────────────────────────────────────────────

  private async createJwtSession(
    user: User,
    ip: string,
    userAgent: string,
  ): Promise<{ token: string; session: Session }> {
    const payload = { sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);
    const tokenHash = hashToken(token);

    const session = this.sessionRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      ip,
      userAgent,
    });
    await this.sessionRepo.save(session);
    return { token, session };
  }

  // ─── Login: email + password → device token + JWT ────────────────────────

  async login(
    email: string,
    password: string,
    ip: string,
    userAgent: string,
  ) {
    this.checkRateLimit(ip);

    const pepper = this.config.get('pinPepper', { infer: true }) ?? '';

    const user = await this.userRepo.findOne({
      where: { email: ILike(email.trim()), status: UserStatus.ACTIVA },
    });

    const credentialsInvalid =
      !user ||
      !user.passwordHash ||
      !(await argon2.verify(
        user.passwordHash,
        password + pepper,
        this.getArgon2Opts(),
      ).catch(() => false));

    if (credentialsInvalid) {
      this.recordFailedAttempt(ip);
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    this.clearRateLimit(ip);

    // Create device token (30 days)
    const rawDeviceToken = randomBytes(32).toString('hex');
    const deviceTokenHash = hashToken(rawDeviceToken);
    const deviceExpiresAt = new Date(
      Date.now() + DEVICE_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );

    const deviceToken = this.deviceTokenRepo.create({
      tokenHash: deviceTokenHash,
      userId: user!.id,
      expiresAt: deviceExpiresAt,
      ip,
      userAgent,
    });
    await this.deviceTokenRepo.save(deviceToken);

    const { token, session } = await this.createJwtSession(user!, ip, userAgent);

    const { pinHash, passwordHash, ...rest } = user!;
    const monthStats = await this.computeMonthStats(user!.id);

    return {
      deviceToken: rawDeviceToken,
      deviceExpiresAt,
      token,
      expiresAt: session.expiresAt,
      user: rest,
      monthStats,
    };
  }

  // ─── Unlock: PIN + device token → JWT ────────────────────────────────────

  async unlock(
    pin: string,
    rawDeviceToken: string,
    ip: string,
    userAgent: string,
  ) {
    const isDev = process.env.NODE_ENV !== 'production';
    const isDevBypass = isDev && rawDeviceToken === '__dev__';

    if (!isDevBypass) {
      // Validate device token (403 if invalid/expired)
      const deviceTokenHash = hashToken(rawDeviceToken);
      const deviceToken = await this.deviceTokenRepo.findOne({
        where: {
          tokenHash: deviceTokenHash,
          revokedAt: IsNull() as any,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!deviceToken) {
        throw new HttpException(
          'La sesión del dispositivo expiró. Inicia sesión con correo y contraseña.',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    this.checkRateLimit(ip);

    const pepper = this.config.get('pinPepper', { infer: true }) ?? '';
    const users = await this.userRepo.find({
      where: { status: UserStatus.ACTIVA },
    });

    let matched: User | null = null;
    for (const user of users) {
      const valid = await argon2.verify(
        user.pinHash,
        pin + pepper,
        this.getArgon2Opts(),
      ).catch(() => false);
      if (valid) {
        matched = user;
        break;
      }
    }

    if (!matched) {
      this.recordFailedAttempt(ip);
      throw new UnauthorizedException('PIN incorrecto');
    }

    this.clearRateLimit(ip);

    const { token, session } = await this.createJwtSession(
      matched,
      ip,
      userAgent,
    );

    const { pinHash, passwordHash, ...rest } = matched;
    const monthStats = await this.computeMonthStats(matched.id);

    return {
      token,
      expiresAt: session.expiresAt,
      user: rest,
      monthStats,
    };
  }

  // ─── Lock: revoke JWT session ─────────────────────────────────────────────

  async lock(userId: string, token: string) {
    const tokenHash = hashToken(token);
    await this.sessionRepo.update(
      { userId, tokenHash, revokedAt: IsNull() as any },
      { revokedAt: new Date() },
    );
    return { ok: true };
  }

  // ─── Logout: revoke device token (+ optional JWT session) ─────────────────

  async logout(rawDeviceToken: string) {
    const deviceTokenHash = hashToken(rawDeviceToken);
    await this.deviceTokenRepo.update(
      { tokenHash: deviceTokenHash, revokedAt: IsNull() as any },
      { revokedAt: new Date() },
    );
    return { ok: true };
  }

  // ─── JWT / session validation ─────────────────────────────────────────────

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

  async validateSession(token: string): Promise<boolean> {
    const tokenHash = hashToken(token);
    const session = await this.sessionRepo.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull() as any,
        expiresAt: MoreThan(new Date()),
      },
    });
    return !!session;
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { pinHash, passwordHash, ...rest } = user;
    return rest;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  private async computeMonthStats(userId: string): Promise<MonthStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

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

    const saleIds = sales.map((s) => s.id);
    let servicesDone = 0;
    let retailSales = 0;

    if (saleIds.length > 0) {
      const lines = await this.lineRepo
        .createQueryBuilder('l')
        .where('l.saleId IN (:...ids)', { ids: saleIds })
        .getMany();

      for (const l of lines) {
        if (l.itemType === ItemType.SERVICE) servicesDone += l.qty;
        if (l.itemType === ItemType.PRODUCT)
          retailSales += Number(l.price) * l.qty;
      }
    }

    return { totalSales, retailSales, servicesDone, newClients, tipsCollected };
  }
}
