import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class YearQueryDto {
  @ApiProperty({ description: 'Year for analytics', example: 2025 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;
}
