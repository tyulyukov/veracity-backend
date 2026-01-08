import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from '@/common/dto/cursor-pagination.dto';

export type EventFilterType = 'all' | 'registered';

export class EventsQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter events',
    enum: ['all', 'registered'],
    default: 'all',
  })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'registered'])
  filter?: EventFilterType = 'all';
}
