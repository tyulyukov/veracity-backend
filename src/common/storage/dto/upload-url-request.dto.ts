import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { StorageEntity, StorageField } from '@/common/storage/storage-path.builder';

export class UploadUrlRequestDto {
  @ApiProperty({ example: 'users', enum: ['users'] })
  @IsString()
  @IsIn(['users'])
  entity: StorageEntity;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  entityId: string;

  @ApiProperty({ example: 'avatar', enum: ['avatar'] })
  @IsString()
  @IsIn(['avatar'])
  field: StorageField;

  @ApiProperty({ example: 'profile.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[\w\-. ]+$/, { message: 'filename contains invalid characters' })
  filename: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @Matches(/^image\/(jpeg|jpg|png|gif|webp)$/, {
    message: 'contentType must be a valid image type',
  })
  contentType: string;
}
