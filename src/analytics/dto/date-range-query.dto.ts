import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum TimeInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class DateRangeQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2025-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (ISO 8601)', example: '2025-12-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Time interval for grouping',
    enum: TimeInterval,
    default: TimeInterval.DAY,
  })
  @IsOptional()
  @IsEnum(TimeInterval)
  interval?: TimeInterval = TimeInterval.DAY;
}
