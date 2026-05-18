import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; role: string }) {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException();

    const [user, sessionOk] = await Promise.all([
      this.authService.validateUser(payload.sub),
      this.authService.validateSession(token),
    ]);

    if (!user) throw new UnauthorizedException('Usuario inválido');
    if (!sessionOk)
      throw new UnauthorizedException('Sesión revocada o expirada');
    return user;
  }
}
