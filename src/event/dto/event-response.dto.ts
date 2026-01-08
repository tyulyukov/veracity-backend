import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeakerDto } from './speaker.dto';

export class EventResponseDto {
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
  speaker: SpeakerDto;

  @ApiProperty()
  isRegistered: boolean;

  @ApiProperty()
  createdAt: Date;
}
