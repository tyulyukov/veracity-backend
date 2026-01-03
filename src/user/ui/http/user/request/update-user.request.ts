import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { UserStatus } from '../../../../domain/enum/user-status.enum';
import { ContactInfo } from '../../../../domain/type/contact-info';
import { UpdateUserInput } from '../../../../operation/user/input/update-user.input';

export class UpdateUserRequestDto {
  @ApiPropertyOptional({ example: 'john.doe@example.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'John', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 'Software Engineer', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string | null;

  @ApiPropertyOptional({
    example: { telegram: '@johndoe', linkedin: 'john-doe' },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  contactInfo?: ContactInfo | null;

  @ApiPropertyOptional({ example: 'Experienced developer with 10 years in tech' })
  @IsOptional()
  @IsString()
  shortDescription?: string | null;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  @IsOptional()
  @IsISO8601()
  lastActivityAt?: string | null;

  toInput(id: string): UpdateUserInput {
    return {
      id,
      ...(this.email !== undefined && { email: this.email }),
      ...(this.firstName !== undefined && { firstName: this.firstName }),
      ...(this.lastName !== undefined && { lastName: this.lastName }),
      ...(this.avatarUrl !== undefined && { avatarUrl: this.avatarUrl }),
      ...(this.position !== undefined && { position: this.position }),
      ...(this.contactInfo !== undefined && { contactInfo: this.contactInfo }),
      ...(this.shortDescription !== undefined && { shortDescription: this.shortDescription }),
      ...(this.status !== undefined && { status: this.status }),
      ...(this.lastActivityAt !== undefined && {
        lastActivityAt: this.lastActivityAt ? new Date(this.lastActivityAt) : null,
      }),
    };
  }
}

