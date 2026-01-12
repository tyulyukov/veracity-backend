import { AppError } from '@/common/error/app.error';

export class PostAlreadyDeletedError extends AppError {
  constructor() {
    super({
      message: 'Post has been deleted',
      code: 'POST_ALREADY_DELETED',
      statusCode: 400,
    });
  }
}
