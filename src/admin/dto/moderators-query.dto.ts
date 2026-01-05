import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination.dto';

export class ModeratorsQueryDto extends OffsetPaginationDto {
  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
