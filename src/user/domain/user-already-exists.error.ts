import { AppError } from '@/common/error/app.error';

export class UserAlreadyExistsError extends AppError {
  constructor(email: string) {
    super({
      message: 'User with this email already exists',
      code: 'USER_ALREADY_EXISTS',
      statusCode: 409,
      context: { email },
    });
  }
}
