import { AppError } from '@/common/error/app.error';

export class UserNotActiveError extends AppError {
  constructor() {
    super({
      message: 'User is not active',
      code: 'USER_NOT_ACTIVE',
      statusCode: 403,
    });
  }
}
