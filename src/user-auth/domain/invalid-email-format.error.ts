import { AppError } from '@/common/error/app.error';

export class InvalidEmailFormatError extends AppError {
  constructor(email: string) {
    super({
      message: 'Invalid email format',
      code: 'INVALID_EMAIL_FORMAT',
      statusCode: 400,
      context: { email },
    });
  }
}
