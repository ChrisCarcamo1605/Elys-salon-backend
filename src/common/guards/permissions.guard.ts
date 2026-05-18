import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Role } from '../enums';
import { PermissionsService } from '../../modules/permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private permissionsService: PermissionsService | null = null;

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {}

  private async getPermissionsService(): Promise<PermissionsService> {
    if (!this.permissionsService) {
      this.permissionsService = await this.moduleRef.resolve(PermissionsService, undefined as any, { strict: false });
    }
    return this.permissionsService!;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    const perm = required[0];
    const overridden = user.permissions?.[perm];
    if (overridden === true) return true;
    if (overridden === false) return false;

    const permissionsService = await this.getPermissionsService();
    if (permissionsService) {
      const defaults = await permissionsService.getDefaultForRole(user.role);
      const allowed = defaults[perm] ?? false;
      if (allowed) return true;
    }

    throw new ForbiddenException(`Permiso insuficiente: ${perm}`);
  }
}