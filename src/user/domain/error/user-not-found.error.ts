import { AppError } from '../../../common/error/app.error';

export class UserNotFoundError extends AppError {
  constructor(userId: string) {
    super({
      message: `User with id ${userId} not found`,
      code: 'USER_NOT_FOUND',
      statusCode: 404,
      context: { userId },
    });
  }
}

