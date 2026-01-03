import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { Logger } from 'nestjs-pino';
import { AppError } from '@/common/error/app.error';

@Catch(AppError)
@Injectable()
export class AppErrorFilter implements ExceptionFilter {
  constructor(
    private readonly logger: Logger,
    private readonly cls: ClsService,
  ) {}

  catch(exception: AppError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = this.cls.getId();

    this.logger.error(
      {
        requestId,
        code: exception.code,
        context: exception.context,
        stack: exception.stack,
      },
      exception.message,
    );

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
      context: exception.context,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
