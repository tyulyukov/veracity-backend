import { AppError } from '@/common/error/app.error';

export class ModeratorAlreadyExistsError extends AppError {
  constructor(email: string) {
    super({
      message: 'Moderator already exists',
      code: 'MODERATOR_ALREADY_EXISTS',
      statusCode: 409,
      context: { email },
    });
  }
}
