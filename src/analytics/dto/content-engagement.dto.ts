import { ApiProperty } from '@nestjs/swagger';

export class ContentEngagementDataPointDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Number of new posts created' })
  postsCount: number;

  @ApiProperty({ description: 'Number of likes given' })
  likesCount: number;

  @ApiProperty({ description: 'Number of comments made' })
  commentsCount: number;
}
