import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectedUserResponseDto {
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

  @ApiProperty()
  isConnected: boolean;

  @ApiProperty()
  hasOutgoingRequest: boolean;

  @ApiProperty()
  hasIncomingRequest: boolean;

  @ApiProperty()
  connectionCreatedAt: Date;
}

export class PaginatedConnectionsResponseDto {
  @ApiProperty({ type: [ConnectedUserResponseDto] })
  users: ConnectedUserResponseDto[];

  @ApiPropertyOptional()
  nextCursor: string | null;
}
