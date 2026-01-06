import { AppError } from '@/common/error/app.error';

export class TargetUserNotActiveError extends AppError {
  constructor() {
    super({
      message: 'Target user is not active',
      code: 'TARGET_USER_NOT_ACTIVE',
      statusCode: 400,
    });
  }
}
