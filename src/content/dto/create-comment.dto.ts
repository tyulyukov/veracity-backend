import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great post!' })
  @IsString()
  @MaxLength(1000)
  text: string;
}
