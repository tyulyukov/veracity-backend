import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID } from 'class-validator';
import { StorageEntity, StorageField } from '@/common/storage/storage-path.builder';

export class UploadFileRequestDto {
  @ApiProperty({ example: 'users', enum: ['users', 'events', 'posts'] })
  @IsString()
  @IsIn(['users', 'events', 'posts'])
  entity: StorageEntity;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  entityId: string;

  @ApiProperty({ example: 'avatar', enum: ['avatar', 'event_image', 'post_image'] })
  @IsString()
  @IsIn(['avatar', 'event_image', 'post_image'])
  field: StorageField;
}
