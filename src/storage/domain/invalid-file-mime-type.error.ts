import { AppError } from '@/common/error/app.error';

export class InvalidFileMimeTypeError extends AppError {
  constructor(mimeType: string, allowedTypes: string[]) {
    super({
      message: `Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`,
      code: 'INVALID_FILE_MIME_TYPE',
      statusCode: 400,
    });
  }
}

