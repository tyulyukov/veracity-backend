import { AppError } from '@/common/error/app.error';

export class SessionExpiredError extends AppError {
  constructor() {
    super({
      message: 'Session expired. Please login again.',
      code: 'SESSION_EXPIRED',
      statusCode: 401,
    });
  }
}
