import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RegisterForEventDto {
  @ApiPropertyOptional({ example: 'Looking forward to attending!' })
  @IsOptional()
  @IsString()
  comment?: string;
}
