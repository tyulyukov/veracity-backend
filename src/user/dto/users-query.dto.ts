import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { CursorPaginationDto } from '@/common/dto/cursor-pagination.dto';

export type ConnectionFilterType = 'all' | 'sent_requests' | 'received_requests' | 'connected';

export class UsersQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by interest IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => (value ? (Array.isArray(value) ? value : [value]) : undefined))
  interestIds?: string[];

  @ApiPropertyOptional({ description: 'Search by name (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by position (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;

  @ApiPropertyOptional({
    description: 'Filter by connection status',
    enum: ['all', 'sent_requests', 'received_requests', 'connected'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'sent_requests', 'received_requests', 'connected'])
  connectionFilter?: ConnectionFilterType;
}
