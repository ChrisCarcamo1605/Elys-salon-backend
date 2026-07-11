import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../../common/enums';

@Controller('staff')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Public()
  @Get('public')
  publicHints() {
    return this.service.findPublicHints();
  }

  @Get()
  @RequirePermission('users.read')
  findAll(@Query() query: ListUsersDto, @CurrentUser() user: AuthUser) {
    // No-admin: forzado a su propia sucursal y nunca ve cuentas admin.
    if (user.role !== Role.ADMIN) {
      return this.service.findAll({
        ...query,
        branchId: user.branchId ?? undefined,
        role: query.role === Role.ADMIN ? undefined : (query.role ?? Role.EMPLEADO),
      });
    }
    return this.service.findAll(query);
  }

  @Post()
  @RequirePermission('users.write')
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @RequirePermission('users.read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('users.write')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/pin')
  @RequirePermission('users.write')
  changePin(@Param('id') id: string, @Body() dto: ChangePinDto) {
    return this.service.updatePin(id, dto.pin);
  }

  /** Asigna/actualiza la contraseña de login por correo (p.ej. la cuenta de una sucursal). */
  @Patch(':id/password')
  @RequirePermission('users.write')
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.service.updatePassword(id, dto.password);
  }

  @Delete(':id')
  @RequirePermission('users.delete')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  @Patch(':id/permissions')
  @RequirePermission('users.permissions.manage')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.service.updatePermissions(id, dto);
  }
}
