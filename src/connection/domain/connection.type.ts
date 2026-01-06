export type ConnectionStatus = 'pending' | 'approved' | 'ignored';

export interface Connection {
  requester_user_id: string;
  target_user_id: string;
  status: ConnectionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectionWithAutoApproval extends Connection {
  was_auto_approved: boolean;
}

export interface Interest {
  id: string;
  name: string;
}

export interface ConnectedUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  position: string | null;
  short_description: string | null;
  status: string;
  role: string;
  created_at: Date;
  last_activity_at: Date | null;
  interests: Interest[];
  is_connected: boolean;
  has_outgoing_request: boolean;
  has_incoming_request: boolean;
  connection_created_at: Date;
}
