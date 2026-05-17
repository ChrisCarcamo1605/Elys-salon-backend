export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  database: {
    url: string;
    ssl: boolean;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpires: string;
    refreshExpires: string;
  };
  bcryptCost: number;
  redis: {
    url: string;
  };
  email: {
    provider: 'resend' | 'smtp';
    resendApiKey?: string;
    from: string;
  };
  supabase: {
    url?: string;
    serviceKey?: string;
    storageBucket: string;
  };
  app: {
    frontendUrl: string;
    appUrl: string;
    timezone: string;
  };
  cron: {
    lowStockCheck: string;
    payroll: string;
  };
  thresholds: {
    expenseNotify: number;
  };
  systemUser: {
    email: string;
    password: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV as AppConfig['nodeEnv'],
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.DATABASE_SSL === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpires: process.env.JWT_ACCESS_EXPIRES!,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES!,
  },
  bcryptCost: parseInt(process.env.BCRYPT_COST ?? '12', 10),
  redis: {
    url: process.env.REDIS_URL!,
  },
  email: {
    provider: process.env.EMAIL_PROVIDER as 'resend' | 'smtp',
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM!,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET!,
  },
  app: {
    frontendUrl: process.env.FRONTEND_URL!,
    appUrl: process.env.APP_URL!,
    timezone: process.env.TZ!,
  },
  cron: {
    lowStockCheck: process.env.LOW_STOCK_CHECK_CRON!,
    payroll: process.env.PAYROLL_CRON!,
  },
  thresholds: {
    expenseNotify: parseInt(process.env.EXPENSE_NOTIFY_THRESHOLD ?? '500', 10),
  },
  systemUser: {
    email: process.env.SYSTEM_USER_EMAIL!,
    password: process.env.SYSTEM_USER_PASSWORD!,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '20', 10),
  },
});
