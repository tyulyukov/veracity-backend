import { AppError } from '@/common/error/app.error';

export class UnauthorizedEventAccessError extends AppError {
  constructor() {
    super({
      message: 'You do not have permission to access this event',
      code: 'UNAUTHORIZED_EVENT_ACCESS',
      statusCode: 403,
    });
  }
}
