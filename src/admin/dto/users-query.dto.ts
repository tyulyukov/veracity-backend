import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, MaxLength } from 'class-validator';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination.dto';

export class UsersQueryDto extends OffsetPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: ['pending', 'active', 'inactive'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search by name or email (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
