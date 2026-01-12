import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ example: 'Updated comment' })
  @IsString()
  @MaxLength(1000)
  text: string;
}
