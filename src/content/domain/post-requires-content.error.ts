import { AppError } from '@/common/error/app.error';

export class PostRequiresContentError extends AppError {
  constructor() {
    super({
      message: 'Post must have text or images',
      code: 'POST_REQUIRES_CONTENT',
      statusCode: 400,
    });
  }
}
