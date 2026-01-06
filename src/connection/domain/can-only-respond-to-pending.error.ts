import { AppError } from '@/common/error/app.error';

export class CanOnlyRespondToPendingError extends AppError {
  constructor() {
    super({
      message: 'Can only respond to pending requests',
      code: 'CAN_ONLY_RESPOND_TO_PENDING',
      statusCode: 400,
    });
  }
}
