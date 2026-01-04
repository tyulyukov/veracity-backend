import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OtherUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiPropertyOptional()
  position: string | null;

  @ApiPropertyOptional()
  shortDescription: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  lastActivityAt: Date | null;

  @ApiProperty({ type: [String] })
  interests: { id: string; name: string }[];
}
