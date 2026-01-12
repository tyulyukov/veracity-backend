import { AppError } from '@/common/error/app.error';

export class CommentRequiresTextError extends AppError {
  constructor() {
    super({
      message: 'Comment text is required',
      code: 'COMMENT_REQUIRES_TEXT',
      statusCode: 400,
    });
  }
}
