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
}
