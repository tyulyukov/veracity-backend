import { AppError } from '@/common/error/app.error';

export class AnalyticsAccessDeniedError extends AppError {
  constructor() {
    super({
      message: 'Only owner can access analytics',
      code: 'ANALYTICS_ACCESS_DENIED',
      statusCode: 403,
    });
  }
}
