import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) { }

  @Public()
  @Get()
  @RequirePermission('users.write')
  getAll() {
    return this.service.getAll();
  }

  @Put()
  @RequirePermission('users.write')
  upsertAll(@Body() items: UpdateSettingsDto[]) {
    return this.service.upsertAll(items);
  }

  @Post('backup')
  @RequirePermission('users.write')
  backup() {
    return this.service.triggerBackup();
  }
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly service: SettingsService) { }

  @Get('preferences')
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.service.getPreferences(user.id);
  }

  @Put('preferences')
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.service.updatePreferences(user.id, dto.value);
  }
}
