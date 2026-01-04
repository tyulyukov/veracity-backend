import { AppError } from '@/common/error/app.error';

export class NotAuthorizedAsAdminError extends AppError {
  constructor() {
    super({
      message: 'Not authorized as admin',
      code: 'NOT_AUTHORIZED_AS_ADMIN',
      statusCode: 401,
    });
  }
}
