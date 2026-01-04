import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Cursor for pagination (created_at,id)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Search by name or email (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
