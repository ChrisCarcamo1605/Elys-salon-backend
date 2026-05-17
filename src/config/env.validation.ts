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
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  BCRYPT_COST: Joi.number().integer().min(10).max(15).default(12),

  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .default('redis://localhost:6379'),

  EMAIL_PROVIDER: Joi.string().valid('resend', 'smtp').default('resend'),
  RESEND_API_KEY: Joi.string().allow('').optional(),
  EMAIL_FROM: Joi.string().email().default('noreply@elys-salon.com'),

  STORAGE_PATH: Joi.string().default('/tmp/reports'),

  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  TZ: Joi.string().default('America/El_Salvador'),

  LOW_STOCK_CHECK_CRON: Joi.string().default('0 8 * * *'),
  PAYROLL_CRON: Joi.string().default('0 23 15,L * *'),
  EXPENSE_NOTIFY_THRESHOLD: Joi.number().default(500),

  SYSTEM_USER_EMAIL: Joi.string().email().required(),
  SYSTEM_USER_PASSWORD: Joi.string().min(8).required(),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(20),
});
