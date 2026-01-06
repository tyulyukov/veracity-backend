import { AppError } from '@/common/error/app.error';

export class ConnectionRequestAlreadySentError extends AppError {
  constructor() {
    super({
      message: 'Connection request already sent',
      code: 'CONNECTION_REQUEST_ALREADY_SENT',
      statusCode: 409,
    });
  }
}
