import { AppError } from '@/common/error/app.error';

export class LikeNotFoundError extends AppError {
  constructor() {
    super({
      message: 'Like not found',
      code: 'LIKE_NOT_FOUND',
      statusCode: 404,
    });
  }
}
