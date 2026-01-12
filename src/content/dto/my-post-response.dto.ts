import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MyPostResponseDto {
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
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
