import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppConfig } from './configuration';

export const databaseConfigFactory = (
  configService: ConfigService<AppConfig, true>,
): TypeOrmModuleOptions => {
  const db = configService.get('database', { infer: true });
  const nodeEnv = configService.get('nodeEnv', { infer: true });
  return {
    type: 'postgres',
    url: db.url,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    entities: [__dirname + '/../**/*.entity.{ts,js}'],
    migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: nodeEnv === 'development' ? ['error', 'warn', 'migration'] : ['error'],
  };
};