import { AppError } from '@/common/error/app.error';

export class CanOnlyDeletePendingError extends AppError {
  constructor() {
    super({
      message: 'Can only delete pending requests',
      code: 'CAN_ONLY_DELETE_PENDING',
      statusCode: 400,
    });
  }
}
