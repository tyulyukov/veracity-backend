import { AppError } from '@/common/error/app.error';

export class CommentNotFoundError extends AppError {
  constructor(commentId?: string) {
    super({
      message: commentId ? `Comment with ID ${commentId} not found` : 'Comment not found',
      code: 'COMMENT_NOT_FOUND',
      statusCode: 404,
    });
  }
}
