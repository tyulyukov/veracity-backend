import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../../domain/enum/user-status.enum';
import { ContactInfo } from '../../../../domain/type/contact-info';
import { UserOutput } from '../../../../operation/user/output/user.output';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl: string | null;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  position: string | null;

  @ApiPropertyOptional({
    example: { telegram: '@johndoe', linkedin: 'john-doe' },
    type: 'object',
    additionalProperties: true,
  })
  contactInfo: ContactInfo | null;

  @ApiPropertyOptional({ example: 'Experienced developer with 10 years in tech' })
  shortDescription: string | null;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-01-20T14:45:00Z' })
  lastActivityAt: Date | null;

  static fromOutput(output: UserOutput): UserResponseDto {
    const response = new UserResponseDto();
    response.id = output.id;
    response.email = output.email;
    response.firstName = output.firstName;
    response.lastName = output.lastName;
    response.avatarUrl = output.avatarUrl;
    response.position = output.position;
    response.contactInfo = output.contactInfo;
    response.shortDescription = output.shortDescription;
    response.status = output.status;
    response.createdAt = output.createdAt;
    response.lastActivityAt = output.lastActivityAt;
    return response;
  }
}

