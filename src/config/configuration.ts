export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  database: { url: string; ssl: boolean };
  jwt: { secret: string; expires: string };
  argon2: { memory: number; time: number };
  pinPepper: string;
  redis: { url: string };
  email: { provider: 'resend' | 'smtp'; resendApiKey?: string; from: string };
  storage: { path: string };
  app: { frontendUrl: string; appUrl: string; timezone: string };
  cron: { lowStockCheck: string; alertSnoozeReopen: string };
  slowMoverDays: number;
  lockTimeoutSec: number;
  throttle: {
    ttl: number;
    limit: number;
    loginTtl: number;
    loginLimit: number;
    loginBlockMin: number;
  };
  systemUserPin: string;
}

export const configuration = (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.DATABASE_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expires: process.env.JWT_EXPIRES ?? '8h',
  },
  argon2: {
    memory: parseInt(process.env.ARGON2_MEMORY ?? '65536', 10),
    time: parseInt(process.env.ARGON2_TIME ?? '3', 10),
  },
  pinPepper: process.env.PIN_PEPPER!,
  redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  email: {
    provider: (process.env.EMAIL_PROVIDER as 'resend' | 'smtp') ?? 'resend',
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM ?? 'noreply@elyssalon.mx',
  },
  storage: { path: process.env.STORAGE_PATH ?? '/reports' },
  app: {
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    appUrl: process.env.APP_URL ?? 'https://app.elyssalon.mx',
    timezone: process.env.TZ ?? 'America/El_Salvador',
  },
  cron: {
    lowStockCheck: process.env.LOW_STOCK_CHECK_CRON ?? '0 8 * * *',
    alertSnoozeReopen: process.env.ALERT_SNOOZE_REOPEN_CRON ?? '0 * * * *',
  },
  slowMoverDays: parseInt(process.env.SLOW_MOVER_DAYS ?? '14', 10),
  lockTimeoutSec: parseInt(process.env.LOCK_TIMEOUT_SEC ?? '120', 10),
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '1000', 10),
    loginTtl: parseInt(process.env.THROTTLE_LOGIN_TTL ?? '30', 10),
    loginLimit: parseInt(process.env.THROTTLE_LOGIN_LIMIT ?? '5', 10),
    loginBlockMin: parseInt(process.env.THROTTLE_LOGIN_BLOCK_MIN ?? '5', 10),
  },
  systemUserPin: process.env.SYSTEM_USER_PIN ?? '',
});


