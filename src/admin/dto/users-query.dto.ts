import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';
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
}
