import { AppError } from '@/common/error/app.error';

export class ModeratorNotFoundError extends AppError {
  constructor(email: string) {
    super({
      message: 'Moderator not found',
      code: 'MODERATOR_NOT_FOUND',
      statusCode: 404,
      context: { email },
    });
  }
}
