import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrationResponseDto {
  @ApiProperty()
  eventId: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  comment: string | null;

  @ApiProperty()
  createdAt: Date;
}
