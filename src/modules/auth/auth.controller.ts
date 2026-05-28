import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UnlockDto } from './dto/unlock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';

class LogoutDto {
  @IsString()
  deviceToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Email + password → device token (30 días) + JWT de sesión (8 h) */
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const ua = req.headers['user-agent'] ?? '';
    return this.authService.login(dto.email, dto.password, ip, ua);
  }

  /** PIN + device token → JWT de sesión (8 h) */
  @Public()
  @Post('unlock')
  async unlock(@Body() dto: UnlockDto, @Req() req: any) {
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const ua = req.headers['user-agent'] ?? '';
    return this.authService.unlock(dto.pin, dto.deviceToken, ip, ua);
  }

  /** Bloqueo de pantalla: revoca solo la sesión JWT, preserva el device token */
  @UseGuards(JwtAuthGuard)
  @Post('lock')
  async lock(@CurrentUser() user: AuthUser, @Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.lock(user.id, token);
  }

  /** Cierre de sesión completo: revoca el device token (JWT expirará solo) */
  @Public()
  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.deviceToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }
}
