export interface Interest {
  id: string;
  name: string;
}

export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  position: string | null;
  contact_info: Record<string, string> | null;
  short_description: string | null;
  status: string;
  role: string;
  created_at: Date;
  last_activity_at: Date | null;
}

export interface UserWithInterests extends UserRow {
  interests: Interest[];
  total_connections: number;
}

export interface UserWithInterestsAndStats extends UserWithInterests {
  total_connections: number;
  pending_sent_count: number;
  pending_received_count: number;
}

export interface OtherUserRow {
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
}

export interface OtherUserWithInterests extends OtherUserRow {
  interests: Interest[];
  is_connected: boolean;
  has_outgoing_request: boolean;
  has_incoming_request: boolean;
}

export interface OtherUserDetailWithInterests extends OtherUserWithInterests {
  contact_info: Record<string, string> | null;
  total_connections: number;
}
