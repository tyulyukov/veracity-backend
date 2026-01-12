import { AppError } from '@/common/error/app.error';

export class AlreadyLikedError extends AppError {
  constructor() {
    super({
      message: 'You have already liked this post',
      code: 'ALREADY_LIKED',
      statusCode: 400,
    });
  }
}
