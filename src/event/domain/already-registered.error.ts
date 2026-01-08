import { AppError } from '@/common/error/app.error';

export class AlreadyRegisteredError extends AppError {
  constructor() {
    super({
      message: 'Already registered for this event',
      code: 'ALREADY_REGISTERED',
      statusCode: 409,
    });
  }
}
