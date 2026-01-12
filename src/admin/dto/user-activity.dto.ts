import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserActivityDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ['post_created', 'post_deleted', 'liked', 'commented'] })
  activityType: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty({ enum: ['post', 'comment'] })
  entityType: string;

  @ApiPropertyOptional()
  contentPreview: string | null;

  @ApiPropertyOptional({ type: [String] })
  imageUrls: string[] | null;

  @ApiProperty()
  activityAt: Date;
}
