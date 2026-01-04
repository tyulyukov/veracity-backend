import { AppError } from '@/common/error/app.error';

export class OtpThrottledError extends AppError {
  constructor() {
    super({
      message: 'Too many attempts. Please try again later',
      code: 'OTP_THROTTLED',
      statusCode: 429,
    });
  }
}
