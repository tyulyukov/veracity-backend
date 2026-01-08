import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeakerDto } from './speaker.dto';

export class EventListItemDto {
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

  @ApiProperty({ type: [String] })
  imageUrls: string[];

  @ApiPropertyOptional()
  limitParticipants: number | null;

  @ApiProperty()
  participantCount: number;

  @ApiProperty()
  speaker: SpeakerDto;

  @ApiProperty()
  isRegistered: boolean;
}
