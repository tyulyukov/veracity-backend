import { ApiProperty } from '@nestjs/swagger';

export class ConnectionResponseDto {
  @ApiProperty()
  requesterUserId: string;

  @ApiProperty()
  targetUserId: string;

  @ApiProperty({ enum: ['pending', 'approved', 'ignored'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  wasAutoApproved: boolean;
}
