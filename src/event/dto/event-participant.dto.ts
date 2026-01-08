import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventParticipantDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiProperty()
  role: string;

  @ApiPropertyOptional()
  comment: string | null;

  @ApiProperty()
  registrationCreatedAt: Date;
}
