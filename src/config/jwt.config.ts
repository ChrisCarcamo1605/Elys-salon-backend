import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { AppConfig } from './configuration';

export const jwtConfigFactory = (
  configService: ConfigService<AppConfig, true>,
): JwtModuleOptions => ({
  secret: configService.get('jwt.secret', { infer: true }),
  signOptions: {
    expiresIn: configService.get('jwt.expires', { infer: true }),
  },
});
