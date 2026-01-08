import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventListItemDto } from './event-list-item.dto';

export class PaginatedEventsResponseDto {
  @ApiProperty({ type: [EventListItemDto] })
  events: EventListItemDto[];

  @ApiPropertyOptional({ description: 'Cursor for next page' })
  nextCursor?: string;
}
