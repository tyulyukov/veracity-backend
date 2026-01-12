import { AppError } from '@/common/error/app.error';

export class NotConnectedToUserError extends AppError {
  constructor(userId?: string) {
    super({
      message: userId
        ? `You are not connected to user with ID ${userId}`
        : 'You are not connected to this user',
      code: 'NOT_CONNECTED_TO_USER',
      statusCode: 403,
    });
  }
}
