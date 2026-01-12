import { AppError } from '@/common/error/app.error';

export class PostNotFoundError extends AppError {
  constructor(postId?: string) {
    super({
      message: postId ? `Post with ID ${postId} not found` : 'Post not found',
      code: 'POST_NOT_FOUND',
      statusCode: 404,
    });
  }
}
