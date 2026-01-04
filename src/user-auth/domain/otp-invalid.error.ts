import { AppError } from '@/common/error/app.error';

export class OtpInvalidError extends AppError {
  constructor() {
    super({
      message: 'Invalid OTP code',
      code: 'OTP_INVALID',
      statusCode: 400,
    });
  }
}
