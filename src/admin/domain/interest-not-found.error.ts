import { AppError } from '@/common/error/app.error';

export class InterestNotFoundError extends AppError {
  constructor(id: string) {
    super({
      message: 'Interest not found',
      code: 'INTEREST_NOT_FOUND',
      statusCode: 404,
      context: { id },
    });
  }
}
