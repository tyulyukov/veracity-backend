import { AppError } from '@/common/error/app.error';

export class ForbiddenOperationError extends AppError {
  constructor(message: string) {
    super({
      message,
      code: 'FORBIDDEN_OPERATION',
      statusCode: 403,
    });
  }
}
