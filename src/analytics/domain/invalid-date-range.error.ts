import { AppError } from '@/common/error/app.error';

export class InvalidDateRangeError extends AppError {
  constructor() {
    super({
      message: 'End date must be after start date',
      code: 'INVALID_DATE_RANGE',
      statusCode: 400,
    });
  }
}
