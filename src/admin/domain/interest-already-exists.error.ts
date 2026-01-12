import { AppError } from '@/common/error/app.error';

export class InterestAlreadyExistsError extends AppError {
  constructor(name: string) {
    super({
      message: 'Interest already exists',
      code: 'INTEREST_ALREADY_EXISTS',
      statusCode: 409,
      context: { name },
    });
  }
}
