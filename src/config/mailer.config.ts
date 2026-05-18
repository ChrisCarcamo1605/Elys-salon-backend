import { ConfigService } from '@nestjs/config';
import { MailerOptions } from '@nestjs-modules/mailer';
import { AppConfig } from './configuration';

export const mailerConfigFactory = (
  configService: ConfigService<AppConfig, true>,
): MailerOptions => {
  const provider = configService.get('email.provider', { infer: true });
  if (provider === 'resend') {
    return {
      transport: {
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: configService.get('email.resendApiKey', { infer: true }),
        },
      },
      defaults: {
        from: configService.get('email.from', { infer: true }),
      },
    };
  }
  return {
    transport: {
      host: process.env.SMTP_HOST ?? 'localhost',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    },
    defaults: {
      from: configService.get('email.from', { infer: true }),
    },
  };
};