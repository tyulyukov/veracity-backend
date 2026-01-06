import { AppError } from '@/common/error/app.error';

export class ConnectionAlreadyExistsError extends AppError {
  constructor() {
    super({
      message: 'Connection already exists',
      code: 'CONNECTION_ALREADY_EXISTS',
      statusCode: 409,
    });
  }
}
