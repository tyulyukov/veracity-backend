import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeakerEventResponseDto {
  @ApiProperty()
  id: string;

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
}
