import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ['pending', 'active', 'inactive'] })
  @IsEnum(['pending', 'active', 'inactive'])
  status: 'pending' | 'active' | 'inactive';
}
