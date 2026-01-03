export interface AppErrorOptions {
  message: string;
  code?: string;
  statusCode?: number;
  cause?: Error;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code || 'INTERNAL_ERROR';
    this.statusCode = options.statusCode || 500;
    this.context = options.context;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}
