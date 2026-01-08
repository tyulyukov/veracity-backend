import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'Tech Talk: Cloud Architecture' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: true, description: 'Whether the event is online or offline' })
  @IsBoolean()
  isOnline: boolean;

  @ApiProperty({ example: '2026-02-15T18:00:00Z' })
  @IsDateString()
  eventDate: string;

  @ApiPropertyOptional({ example: 'Conference Room A, Building 5' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.example.com/tech-talk' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({
    example: 'Join us for an in-depth discussion on cloud architecture patterns',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['https://example.com/image1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ type: [String], example: ['technology', 'cloud', 'architecture'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: 50,
    description: 'Maximum number of participants (null for unlimited)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limitParticipants?: number;
}
