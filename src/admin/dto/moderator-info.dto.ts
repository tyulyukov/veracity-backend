import { ApiProperty } from '@nestjs/swagger';

export class ModeratorInfoDto {
  @ApiProperty()
  email: string;

  @ApiProperty({ enum: ['moderator', 'owner'] })
  role: 'moderator' | 'owner';
}
