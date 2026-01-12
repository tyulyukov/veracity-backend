import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsArray, IsOptional } from 'class-validator';

export class CreatePostDto {
  @ApiPropertyOptional({ example: 'This is my first post!' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/image1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
