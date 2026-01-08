import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeakerDto {
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
}
