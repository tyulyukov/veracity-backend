import { AppError } from '@/common/error/app.error';

export class RegistrationNotFoundError extends AppError {
  constructor() {
    super({
      message: 'Event registration not found',
      code: 'REGISTRATION_NOT_FOUND',
      statusCode: 404,
    });
  }
}
