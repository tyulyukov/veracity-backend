import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlResponseDto {
  @ApiProperty({ example: 'https://bucket.r2.cloudflarestorage.com/...' })
  uploadUrl: string;

  @ApiProperty({ example: 'https://storage.tyulyukov.com/local/users/550e.../avatar/profile.jpg' })
  publicUrl: string;
}
