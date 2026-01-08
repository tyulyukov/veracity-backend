import {
  EventListItem,
  EventParticipant,
  EventRegistration,
  EventWithRegistrationStatus,
  Speaker,
  SpeakerEvent,
} from './domain/event.type';
import { EventResponseDto } from './dto/event-response.dto';
import { EventListItemDto } from './dto/event-list-item.dto';
import { SpeakerEventResponseDto } from './dto/speaker-event-response.dto';
import { EventParticipantDto } from './dto/event-participant.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { SpeakerDto } from './dto/speaker.dto';

export function mapSpeakerToDto(speaker: Speaker): SpeakerDto {
  return {
    id: speaker.id,
    firstName: speaker.first_name,
    lastName: speaker.last_name,
    avatarUrl: speaker.avatar_url,
    role: speaker.role,
  };
}

export function mapEventToResponseDto(event: EventWithRegistrationStatus): EventResponseDto {
  return {
    id: event.id,
    name: event.name,
    isOnline: event.is_online,
    eventDate: event.event_date,
    location: event.location,
    link: event.link,
    description: event.description,
    imageUrls: event.image_urls,
    tags: event.tags,
    limitParticipants: event.limit_participants,
    participantCount: event.participant_count,
    speaker: mapSpeakerToDto(event.speaker),
    isRegistered: event.is_registered,
    createdAt: event.created_at,
  };
}

export function mapEventToListItemDto(event: EventListItem): EventListItemDto {
  return {
    id: event.id,
    name: event.name,
    isOnline: event.is_online,
    eventDate: event.event_date,
    location: event.location,
    link: event.link,
    imageUrls: event.image_urls,
    limitParticipants: event.limit_participants,
    participantCount: event.participant_count,
    speaker: mapSpeakerToDto(event.speaker),
    isRegistered: event.is_registered,
  };
}

export function mapSpeakerEventToDto(event: SpeakerEvent): SpeakerEventResponseDto {
  return {
    id: event.id,
    name: event.name,
    isOnline: event.is_online,
    eventDate: event.event_date,
    location: event.location,
    link: event.link,
    description: event.description,
    imageUrls: event.image_urls,
    tags: event.tags,
    limitParticipants: event.limit_participants,
    participantCount: event.participant_count,
    createdAt: event.created_at,
  };
}

export function mapEventParticipantToDto(participant: EventParticipant): EventParticipantDto {
  return {
    id: participant.id,
    firstName: participant.first_name,
    lastName: participant.last_name,
    avatarUrl: participant.avatar_url,
    role: participant.role,
    comment: participant.comment,
    registrationCreatedAt: participant.registration_created_at,
  };
}

export function mapEventRegistrationToDto(
  registration: EventRegistration,
): RegistrationResponseDto {
  return {
    eventId: registration.event_id,
    userId: registration.user_id,
    comment: registration.comment,
    createdAt: registration.created_at,
  };
}
