import { ApiProperty } from '@nestjs/swagger';

export class UploadFileResponseDto {
  @ApiProperty({
    example: 'development/users/550e8400-e29b-41d4-a716-446655440000/avatar/1234567890.jpg',
  })
  path: string;
}
