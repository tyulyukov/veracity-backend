import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['standard_user', 'speaker'] })
  @IsEnum(['standard_user', 'speaker'])
  role: 'standard_user' | 'speaker';
}
