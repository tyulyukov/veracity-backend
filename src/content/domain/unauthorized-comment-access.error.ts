import { AppError } from '@/common/error/app.error';

export class UnauthorizedCommentAccessError extends AppError {
  constructor(action?: string) {
    super({
      message: action
        ? `You can only ${action} your own comments`
        : 'You can only access your own comments',
      code: 'UNAUTHORIZED_COMMENT_ACCESS',
      statusCode: 403,
    });
  }
}
