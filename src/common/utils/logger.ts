import { Logger } from '@nestjs/common';

export interface ErrorContext {
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
  stack?: string;
}

export class AppLogger extends Logger {
  constructor(context: string) {
    super(context);
  }

  errorWithContext({
    message,
    error,
    context: ctx,
    stack,
  }: ErrorContext): void {
    const errorDetails: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      message,
      context: ctx || {},
    };

    if (error instanceof Error) {
      errorDetails.error = {
        name: error.name,
        message: error.message,
        stack: stack || error.stack,
      };
    } else if (typeof error === 'string') {
      errorDetails.error = { message: error };
    } else if (error) {
      errorDetails.error = error;
    }

    if (stack && !errorDetails.error) {
      (errorDetails.error as Record<string, unknown>).stack = stack;
    }

    const errorMsg =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';
    this.error(
      `[ERROR] ${message} | Context: ${JSON.stringify(ctx || {})} | ${errorMsg}`,
      stack || (error instanceof Error ? error.stack : ''),
    );
  }

  warnWithContext(message: string, context?: Record<string, unknown>): void {
    this.warn(`[WARN] ${message} | Context: ${JSON.stringify(context || {})}`);
  }

  infoWithContext(message: string, context?: Record<string, unknown>): void {
    this.log(`[INFO] ${message} | Context: ${JSON.stringify(context || {})}`);
  }

  debugWithContext(message: string, context?: Record<string, unknown>): void {
    this.debug(
      `[DEBUG] ${message} | Context: ${JSON.stringify(context || {})}`,
    );
  }
}

export function createLogger(context: string): AppLogger {
  return new AppLogger(context);
}
