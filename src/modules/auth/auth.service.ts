import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import {
  AuthUser,
  JwtPayload,
  RefreshPayload,
} from '../../common/types/auth-user.type';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';

export interface IssueTokensResult {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends IssueTokensResult {
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.active) {
      throw new ForbiddenException('Usuario desactivado');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return user;
  }

  async login(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    await this.usersService.updateLastLogin(user.id);
    const tokens = await this.issueTokens(user, ip, userAgent);
    const authUser = this.toAuthUser(user);
    return { ...tokens, user: authUser };
  }

  async refresh(
    rawToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<IssueTokensResult> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(rawToken, {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshRepo.findOne({
      where: {
        id: payload.tokenId,
        userId: payload.sub,
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!stored) {
      // posible reuse — revocar todos los tokens del usuario por seguridad
      await this.refreshRepo.update(
        { userId: payload.sub, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Refresh token inválido o reutilizado');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user.active) {
      throw new ForbiddenException('Usuario desactivado');
    }

    const newTokens = await this.issueTokens(user, ip, userAgent);
    const newPayload = await this.jwtService.verifyAsync<RefreshPayload>(
      newTokens.refreshToken,
      {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
      },
    );

    stored.revokedAt = new Date();
    stored.replacedBy = newPayload.tokenId;
    await this.refreshRepo.save(stored);

    return newTokens;
  }

  async logout(userId: string, rawToken?: string): Promise<void> {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.refreshRepo.update(
        { userId, tokenHash, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } else {
      await this.refreshRepo.update(
        { userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.usersService.findById(userId);
    return this.toAuthUser(user);
  }

  private async issueTokens(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<IssueTokensResult> {
    const permissions = this.usersService.computeEffectivePermissions(user);
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
    };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.get('jwt.accessSecret', { infer: true }),
      expiresIn: this.config.get('jwt.accessExpires', { infer: true }),
    });

    const tokenId = randomBytes(16).toString('hex');
    const refreshPayload: RefreshPayload = { sub: user.id, tokenId };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.get('jwt.refreshSecret', { infer: true }),
      expiresIn: this.config.get('jwt.refreshExpires', { infer: true }),
      jwtid: tokenId,
    });

    const refreshExpires = this.parseDuration(
      this.config.get('jwt.refreshExpires', { infer: true }),
    );
    const tokenHash = this.hashToken(refreshToken);

    await this.refreshRepo.insert({
      id: tokenId,
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + refreshExpires),
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });

    return { accessToken, refreshToken };
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      permissions: this.usersService.computeEffectivePermissions(user),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      return parseInt(value, 10) * 1000;
    }
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    } as const;
    return n * multipliers[unit as keyof typeof multipliers];
  }
}
