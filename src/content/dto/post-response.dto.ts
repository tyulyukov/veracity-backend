import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthorDto } from './author.dto';

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  text: string | null;

  @ApiProperty({ type: [String] })
  imageUrls: string[];

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isLikedByCurrentUser: boolean;

  @ApiProperty()
  author: AuthorDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
