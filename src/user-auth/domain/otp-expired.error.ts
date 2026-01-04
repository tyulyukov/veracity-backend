import { AppError } from '@/common/error/app.error';

export class OtpExpiredError extends AppError {
  constructor() {
    super({
      message: 'OTP code has expired',
      code: 'OTP_EXPIRED',
      statusCode: 400,
    });
  }
}
