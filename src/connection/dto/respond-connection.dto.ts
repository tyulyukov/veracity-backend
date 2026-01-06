import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class RespondConnectionDto {
  @ApiProperty({ enum: ['approved', 'ignored'] })
  @IsString()
  @IsIn(['approved', 'ignored'])
  response: 'approved' | 'ignored';
}
