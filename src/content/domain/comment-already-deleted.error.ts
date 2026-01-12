import { AppError } from '@/common/error/app.error';

export class CommentAlreadyDeletedError extends AppError {
  constructor() {
    super({
      message: 'Comment has been deleted',
      code: 'COMMENT_ALREADY_DELETED',
      statusCode: 400,
    });
  }
}
