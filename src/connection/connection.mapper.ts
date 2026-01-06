import { ConnectionWithAutoApproval, Connection, ConnectedUser } from './domain/connection.type';
import { ConnectionResponseDto } from './dto/connection-response.dto';
import { ConnectedUserResponseDto } from './dto/connected-user-response.dto';

export function mapConnectionToDto(connection: Connection): ConnectionResponseDto {
  return {
    requesterUserId: connection.requester_user_id,
    targetUserId: connection.target_user_id,
    status: connection.status,
    createdAt: connection.created_at,
    updatedAt: connection.updated_at,
    wasAutoApproved: false,
  };
}

export function mapConnectionWithAutoApprovalToDto(
  connection: ConnectionWithAutoApproval,
): ConnectionResponseDto {
  return {
    requesterUserId: connection.requester_user_id,
    targetUserId: connection.target_user_id,
    status: connection.status,
    createdAt: connection.created_at,
    updatedAt: connection.updated_at,
    wasAutoApproved: connection.was_auto_approved,
  };
}

export function mapConnectedUserToDto(user: ConnectedUser): ConnectedUserResponseDto {
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
    connectionCreatedAt: user.connection_created_at,
  };
}
