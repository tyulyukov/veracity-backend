import { AppError } from '@/common/error/app.error';

export class InactiveUserError extends AppError {
  constructor() {
    super({
      message: 'Only active users can access this resource',
      code: 'INACTIVE_USER',
      statusCode: 403,
    });
  }
}
