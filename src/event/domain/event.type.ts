export interface Speaker {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
}

export interface Event {
  id: string;
  speaker_id: string;
  name: string;
  is_online: boolean;
  event_date: Date;
  location: string | null;
  link: string | null;
  description: string | null;
  image_urls: string[];
  tags: string[];
  limit_participants: number | null;
  created_at: Date;
}

export interface EventWithDetails extends Event {
  participant_count: number;
  speaker: Speaker;
}

export interface EventWithRegistrationStatus extends EventWithDetails {
  is_registered: boolean;
}

export interface EventListItem {
  id: string;
  name: string;
  is_online: boolean;
  event_date: Date;
  location: string | null;
  link: string | null;
  image_urls: string[];
  limit_participants: number | null;
  participant_count: number;
  speaker: Speaker;
  is_registered: boolean;
}

export interface SpeakerEvent {
  id: string;
  name: string;
  is_online: boolean;
  event_date: Date;
  location: string | null;
  link: string | null;
  description: string | null;
  image_urls: string[];
  tags: string[];
  limit_participants: number | null;
  participant_count: number;
  created_at: Date;
}

export interface EventRegistration {
  event_id: string;
  user_id: string;
  comment: string | null;
  created_at: Date;
}

export interface EventParticipant {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
  comment: string | null;
  registration_created_at: Date;
}

export interface UserEventRelation {
  user_id: string;
  event_relation_type: 'created' | 'registered';
  event_id: string;
  name: string;
  is_online: boolean;
  event_date: Date;
  location: string | null;
  link: string | null;
  description: string | null;
  image_urls: string[];
  tags: string[];
  limit_participants: number | null;
  participant_count: number;
  created_at: Date;
  registration_comment: string | null;
  registration_created_at: Date | null;
}
