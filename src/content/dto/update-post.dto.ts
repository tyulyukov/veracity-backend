import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsArray } from 'class-validator';

export class UpdatePostDto {
  @ApiPropertyOptional({ example: 'Updated content' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
