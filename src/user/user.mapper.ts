import { UserWithInterests, OtherUserWithInterests } from './domain/user.type';
import { UserResponseDto } from './dto/user-response.dto';
import { OtherUserResponseDto } from './dto/other-user-response.dto';

export function mapUserToDto(user: UserWithInterests): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    avatarUrl: user.avatar_url,
    position: user.position,
    contactInfo: user.contact_info,
    shortDescription: user.short_description,
    status: user.status,
    role: user.role,
    createdAt: user.created_at,
    lastActivityAt: user.last_activity_at,
    interests: user.interests,
  };
}

export function mapOtherUserToDto(user: OtherUserWithInterests): OtherUserResponseDto {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    avatarUrl: user.avatar_url,
    position: user.position,
    shortDescription: user.short_description,
    status: user.status,
    role: user.role,
    createdAt: user.created_at,
    lastActivityAt: user.last_activity_at,
    interests: user.interests,
  };
}
