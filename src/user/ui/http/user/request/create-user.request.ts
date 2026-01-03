import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { UserStatus } from '../../../../domain/enum/user-status.enum';
import { ContactInfo } from '../../../../domain/type/contact-info';
import { CreateUserInput } from '../../../../operation/user/input/create-user.input';

export class CreateUserRequestDto {
  @ApiProperty({ example: 'john.doe@example.com', maxLength: 255 })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'John', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Software Engineer', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;

  @ApiPropertyOptional({
    example: { telegram: '@johndoe', linkedin: 'john-doe' },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  contactInfo?: ContactInfo;

  @ApiPropertyOptional({ example: 'Experienced developer with 10 years in tech' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.PENDING })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  toInput(): CreateUserInput {
    return {
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      avatarUrl: this.avatarUrl ?? null,
      position: this.position ?? null,
      contactInfo: this.contactInfo ?? null,
      shortDescription: this.shortDescription ?? null,
      status: this.status,
    };
  }
}

