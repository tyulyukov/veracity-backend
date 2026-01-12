import { ApiProperty } from '@nestjs/swagger';
import { AuthorDto } from './author.dto';

export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  author: AuthorDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
