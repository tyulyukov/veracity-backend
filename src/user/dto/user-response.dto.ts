import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiPropertyOptional()
  position: string | null;

  @ApiPropertyOptional()
  contactInfo: Record<string, string> | null;

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

  @ApiProperty({ description: 'Total number of approved connections' })
  totalConnections: number;

  @ApiPropertyOptional()
  pendingSentCount?: number;

  @ApiPropertyOptional()
  pendingReceivedCount?: number;
}
