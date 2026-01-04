import { AppError } from '@/common/error/app.error';

export class InvalidCredentialsError extends AppError {
  constructor() {
    super({
      message: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    });
  }
}
