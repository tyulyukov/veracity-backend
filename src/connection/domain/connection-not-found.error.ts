import { AppError } from '@/common/error/app.error';

export class ConnectionNotFoundError extends AppError {
  constructor() {
    super({
      message: 'Connection request not found',
      code: 'CONNECTION_NOT_FOUND',
      statusCode: 404,
    });
  }
}
