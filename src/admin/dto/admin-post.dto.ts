import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminPostDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  text: string | null;

  @ApiProperty({ type: [String] })
  imageUrls: string[];

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt: Date | null;

  @ApiProperty()
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  };
}
