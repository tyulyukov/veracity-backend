import { AppError } from '@/common/error/app.error';

export class CannotConnectToSelfError extends AppError {
  constructor() {
    super({
      message: 'Cannot send connection request to yourself',
      code: 'CANNOT_CONNECT_TO_SELF',
      statusCode: 400,
    });
  }
}
