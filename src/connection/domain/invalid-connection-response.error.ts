import { AppError } from '@/common/error/app.error';

export class InvalidConnectionResponseError extends AppError {
  constructor() {
    super({
      message: 'Invalid response. Must be approved or ignored',
      code: 'INVALID_CONNECTION_RESPONSE',
      statusCode: 400,
    });
  }
}
