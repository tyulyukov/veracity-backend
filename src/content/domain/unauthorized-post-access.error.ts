import { AppError } from '@/common/error/app.error';

export class UnauthorizedPostAccessError extends AppError {
  constructor(action?: string) {
    super({
      message: action
        ? `You can only ${action} your own posts`
        : 'You can only access your own posts',
      code: 'UNAUTHORIZED_POST_ACCESS',
      statusCode: 403,
    });
  }
}
