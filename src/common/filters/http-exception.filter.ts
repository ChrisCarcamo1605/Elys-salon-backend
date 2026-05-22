import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../utils/logger';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    timestamp?: string;
    path?: string;
    method?: string;
  };
}

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Error interno del servidor';
    let fields: Record<string, string> | undefined;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        if (typeof obj.message === 'string') {
          message = obj.message;
        } else if (Array.isArray(obj.message)) {
          message = obj.message.join('; ');
          fields = {};
          for (const m of obj.message as string[]) {
            const match = m.match(/^(\w+)\s/);
            if (match) fields[match[1]] = m;
          }
        }
        if (obj.fields && typeof obj.fields === 'object' && !Array.isArray(obj.fields)) {
          fields = obj.fields as Record<string, string>;
        }
      }

      const cause = (exception as { cause?: unknown }).cause;
      this.logger.errorWithContext({
        message: `HTTP Error ${status}: ${message}`,
        error: exception,
        context: {
          method: request.method,
          path: request.url,
          query: request.query,
          body: request.body,
          params: request.params,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          ...(cause !== undefined ? { cause: cause instanceof Error
            ? { name: cause.name, message: cause.message, stack: cause.stack }
            : cause } : {}),
        },
      });
    } else if (exception instanceof Error) {
      this.logger.errorWithContext({
        message: `Unhandled Error: ${exception.message}`,
        error: exception,
        context: {
          method: request.method,
          path: request.url,
          query: request.query,
          body: request.body,
          params: request.params,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
        stack: exception.stack,
      });
    } else {
      this.logger.errorWithContext({
        message: `Unknown exception caught`,
        error: exception,
        context: {
          method: request.method,
          path: request.url,
          type: typeof exception,
        },
      });
    }

    const body: ErrorBody = {
      error: {
        code: STATUS_CODE_MAP[status] ?? 'UNKNOWN_ERROR',
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
      },
    };

    response.status(status).json(body);
  }
}
