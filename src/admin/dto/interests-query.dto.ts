import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination.dto';

export class InterestsQueryDto extends OffsetPaginationDto {
  @ApiPropertyOptional({ description: 'Search by interest name (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
