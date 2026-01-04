import { AppError } from '@/common/error/app.error';

export class InsufficientPermissionsError extends AppError {
  constructor() {
    super({
      message: 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      statusCode: 403,
    });
  }
}
