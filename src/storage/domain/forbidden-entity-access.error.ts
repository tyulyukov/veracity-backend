import { AppError } from '@/common/error/app.error';

export class ForbiddenEntityAccessError extends AppError {
  constructor() {
    super({
      message: 'You are not allowed to upload files for this entity',
      code: 'FORBIDDEN_ENTITY_ACCESS',
      statusCode: 403,
    });
  }
}
