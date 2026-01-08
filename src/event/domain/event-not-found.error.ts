import { AppError } from '@/common/error/app.error';

export class EventNotFoundError extends AppError {
  constructor(eventId?: string) {
    super({
      message: eventId ? `Event with ID ${eventId} not found` : 'Event not found',
      code: 'EVENT_NOT_FOUND',
      statusCode: 404,
    });
  }
}
