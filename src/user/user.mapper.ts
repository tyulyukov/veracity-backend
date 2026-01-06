import {
  UserWithInterests,
  UserWithInterestsAndStats,
  OtherUserWithInterests,
  OtherUserDetailWithInterests,
} from './domain/user.type';
import { UserResponseDto } from './dto/user-response.dto';
import { OtherUserResponseDto, OtherUserDetailResponseDto } from './dto/other-user-response.dto';

export function mapUserToDto(user: UserWithInterests | UserWithInterestsAndStats): UserResponseDto {
  const base: UserResponseDto = {
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
    totalConnections: user.total_connections,
  };

  if ('pending_sent_count' in user) {
    return {
      ...base,
      pendingSentCount: user.pending_sent_count,
      pendingReceivedCount: user.pending_received_count,
    };
  }

  return base;
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
    isConnected: user.is_connected,
    hasOutgoingRequest: user.has_outgoing_request,
    hasIncomingRequest: user.has_incoming_request,
  };
}

export function mapOtherUserDetailToDto(
  user: OtherUserDetailWithInterests,
): OtherUserDetailResponseDto {
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
    isConnected: user.is_connected,
    hasOutgoingRequest: user.has_outgoing_request,
    hasIncomingRequest: user.has_incoming_request,
    contactInfo: user.contact_info,
    totalConnections: user.total_connections,
  };
}
