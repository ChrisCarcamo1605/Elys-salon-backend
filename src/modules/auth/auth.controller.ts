import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UnlockDto } from './dto/unlock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { IsString, Length } from 'class-validator';

class ChangePinDto {
  @IsString()
  @Length(4, 4)
  pin: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('unlock')
  async unlock(@Body() dto: UnlockDto, @Req() req: any) {
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const ua = req.headers['user-agent'] ?? '';
    return this.authService.unlock(dto.pin, ip, ua);
  }

  @UseGuards(JwtAuthGuard)
  @Post('lock')
  async lock(@CurrentUser() user: AuthUser, @Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.lock(user.id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }
}