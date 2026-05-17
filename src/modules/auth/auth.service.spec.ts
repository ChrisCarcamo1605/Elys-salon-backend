import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleName } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'admin@elys.com',
    fullName: 'Admin',
    passwordHash: 'hashed',
    active: true,
    role: { id: 'r1', name: RoleName.ADMIN, permissions: [], level: 80 },
    roleId: 'r1',
    userPermissions: [],
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as User;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshRepo: jest.Mocked<Pick<Repository<RefreshToken>, 'findOne' | 'insert' | 'update' | 'save'>>;

  beforeEach(async () => {
    refreshRepo = {
      findOne: jest.fn(),
      insert: jest.fn().mockResolvedValue({ raw: [], identifiers: [{ id: 'token-1' }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmailWithPassword: jest.fn(),
            findById: jest.fn(),
            updateLastLogin: jest.fn().mockResolvedValue(undefined),
            computeEffectivePermissions: jest.fn().mockReturnValue(['users.read']),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed-jwt'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'jwt.accessSecret': 'access-secret',
                'jwt.refreshSecret': 'refresh-secret',
                'jwt.accessExpires': '15m',
                'jwt.refreshExpires': '7d',
              };
              return map[key];
            }),
          },
        },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    usersService = moduleRef.get(UsersService);
    jwtService = moduleRef.get(JwtService);
  });

  describe('validateCredentials', () => {
    it('lanza Unauthorized si el usuario no existe', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);
      await expect(service.validateCredentials('no@x.com', 'pw12345678')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lanza Forbidden si el usuario está desactivado', async () => {
      const user = buildUser({ active: false });
      usersService.findByEmailWithPassword.mockResolvedValue(user);
      await expect(service.validateCredentials(user.email, 'pw12345678')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lanza Unauthorized si la contraseña no coincide', async () => {
      const user = buildUser({ passwordHash: await bcrypt.hash('correcta', 4) });
      usersService.findByEmailWithPassword.mockResolvedValue(user);
      await expect(service.validateCredentials(user.email, 'incorrecta')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('retorna el usuario si las credenciales son válidas', async () => {
      const user = buildUser({ passwordHash: await bcrypt.hash('correcta', 4) });
      usersService.findByEmailWithPassword.mockResolvedValue(user);
      const result = await service.validateCredentials(user.email, 'correcta');
      expect(result.id).toBe(user.id);
    });
  });

  describe('login', () => {
    it('emite tokens y persiste refresh token', async () => {
      const user = buildUser();
      const result = await service.login(user, '127.0.0.1', 'test-agent');
      expect(result.accessToken).toBe('signed-jwt');
      expect(result.refreshToken).toBe('signed-jwt');
      expect(result.user.email).toBe(user.email);
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(user.id);
      expect(refreshRepo.insert).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rechaza un refresh token inválido (signature fail)', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('bad signature'));
      await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('detecta reutilización y revoca todos los tokens del usuario', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({ sub: 'user-1', tokenId: 'token-1' });
      refreshRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.refresh('stolen-token')).rejects.toBeInstanceOf(UnauthorizedException);

      expect(refreshRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });

    it('rota el token: marca el anterior como revocado y emite uno nuevo', async () => {
      jwtService.verifyAsync
        .mockResolvedValueOnce({ sub: 'user-1', tokenId: 'token-old' })
        .mockResolvedValueOnce({ sub: 'user-1', tokenId: 'token-new' });

      const storedToken = {
        id: 'token-old',
        userId: 'user-1',
        revokedAt: null,
        replacedBy: null,
      } as RefreshToken;
      refreshRepo.findOne.mockResolvedValueOnce(storedToken);

      const user = buildUser();
      usersService.findById.mockResolvedValueOnce(user);

      const result = await service.refresh('old-token');

      expect(result.accessToken).toBe('signed-jwt');
      expect(refreshRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'token-old', replacedBy: 'token-new' }),
      );
    });
  });
});
