import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DATABASE_SSL: Joi.boolean().default(false),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES: Joi.string().default('8h'),
  PIN_PEPPER: Joi.string().min(16).required(),
  ARGON2_MEMORY: Joi.number().default(65536),
  ARGON2_TIME: Joi.number().default(3),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .default('redis://localhost:6379'),
  EMAIL_PROVIDER: Joi.string().valid('resend', 'smtp').default('resend'),
  RESEND_API_KEY: Joi.string().allow('').optional(),
  EMAIL_FROM: Joi.string().email().default('noreply@elyssalon.mx'),
  STORAGE_PATH: Joi.string().default('/reports'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  APP_URL: Joi.string().uri().default('https://app.elyssalon.mx'),
  TZ: Joi.string().default('America/El_Salvador'),
  LOW_STOCK_CHECK_CRON: Joi.string().default('0 8 * * *'),
  ALERT_SNOOZE_REOPEN_CRON: Joi.string().default('0 * * * *'),
  SLOW_MOVER_DAYS: Joi.number().default(14),
  LOCK_TIMEOUT_SEC: Joi.number().default(120),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(1000),
  THROTTLE_LOGIN_TTL: Joi.number().default(30),
  THROTTLE_LOGIN_LIMIT: Joi.number().default(5),
  THROTTLE_LOGIN_BLOCK_MIN: Joi.number().default(5),
  SYSTEM_USER_PIN: Joi.string().allow('').optional(),
});
