import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { CursorPaginationDto } from '@/common/dto/cursor-pagination.dto';

export class UsersQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by interest IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => (value ? (Array.isArray(value) ? value : [value]) : undefined))
  interestIds?: string[];

  @ApiPropertyOptional({ description: 'Search by name or email (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
