import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorDto {
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
