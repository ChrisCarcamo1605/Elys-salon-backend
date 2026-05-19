import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');

  // Global error filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Security and performance middleware
  app.use(helmet());
  app.use(compression());

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors) => {
        const fields: Record<string, string> = {};
        for (const e of errors) {
          fields[e.property] = e.constraints
            ? Object.values(e.constraints).join(', ')
            : 'valor inválido';
        }
        const message = Object.entries(fields)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ');
        logger.error(`Validation failed: ${message}`);
        return new BadRequestException({ message, fields });
      },
    }),
  );

  app.enableCors({
    origin: [
      process.env.CORS_ORIGIN ?? 'http://localhost:3001',
      'http://localhost:3000',
      'https://react-frontend-dev-c187.up.railway.app',
      'https://elysalon.shop',
    ],
    credentials: true,
  });

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Ely's Salón API")
    .setDescription("API del sistema de gestión del salón de belleza Ely's")
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Global error handlers
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Promise Rejection: ${reason}`);
    console.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Backend escuchando en :${port}`);
  logger.log(`Swagger en http://localhost:${port}/v1/docs`);
}

void bootstrap();
