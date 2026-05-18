import { ConfigService } from '@nestjs/config';
import { BullModuleOptions } from '@nestjs/bull';
import { AppConfig } from './configuration';

export const redisConfigFactory = (
  configService: ConfigService<AppConfig, true>,
): BullModuleOptions => ({
  redis: configService.get('redis.url', { infer: true }),
});