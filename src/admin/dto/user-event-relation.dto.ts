import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserEventRelationDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ['created', 'registered'] })
  eventRelationType: 'created' | 'registered';

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isOnline: boolean;

  @ApiProperty()
  eventDate: Date;

  @ApiPropertyOptional()
  location: string | null;

  @ApiPropertyOptional()
  link: string | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ type: [String] })
  imageUrls: string[];

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional()
  limitParticipants: number | null;

  @ApiProperty()
  participantCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  registrationComment: string | null;

  @ApiPropertyOptional()
  registrationCreatedAt: Date | null;
}
