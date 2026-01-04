import { AppError } from '@/common/error/app.error';

export class UserNotFoundError extends AppError {
  constructor(userId?: string) {
    super({
      message: 'User not found',
      code: 'USER_NOT_FOUND',
      statusCode: 404,
      context: userId ? { userId } : undefined,
    });
  }
}
