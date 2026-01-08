import { AppError } from '@/common/error/app.error';

export class EventFullError extends AppError {
  constructor() {
    super({
      message: 'Event has reached its participant limit',
      code: 'EVENT_FULL',
      statusCode: 409,
    });
  }
}
