import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserJwtAuthGuard } from '@/user-auth/guard/user-jwt-auth.guard';
import { ActiveUserGuard } from '@/user-auth/guard/user-status.guard';
import { SpeakerGuard } from './guard/speaker.guard';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RegisterForEventDto } from './dto/register-for-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { PaginatedEventsResponseDto } from './dto/paginated-events-response.dto';
import { SpeakerEventResponseDto } from './dto/speaker-event-response.dto';
import { EventParticipantDto } from './dto/event-participant.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import {
  mapEventToResponseDto,
  mapEventToListItemDto,
  mapSpeakerEventToDto,
  mapEventParticipantToDto,
  mapEventRegistrationToDto,
} from './event.mapper';
import { CursorPaginationDto } from '@/common/dto/cursor-pagination.dto';

@ApiTags('Events')
@Controller('events')
@UseGuards(UserJwtAuthGuard, ActiveUserGuard)
@ApiBearerAuth()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  @ApiOperation({ summary: 'Get all events or filter by registration status' })
  @ApiOkResponse({ type: PaginatedEventsResponseDto })
  async getEvents(@Query() query: EventsQueryDto): Promise<PaginatedEventsResponseDto> {
    const result = await this.eventService.getEvents(
      query.filter ?? 'all',
      query.cursor,
      query.limit,
    );
    return {
      events: result.events.map(mapEventToListItemDto),
      nextCursor: result.nextCursor ?? undefined,
    };
  }

  @Get('my')
  @UseGuards(SpeakerGuard)
  @ApiOperation({ summary: "Get speaker's own events" })
  @ApiOkResponse({ type: PaginatedEventsResponseDto })
  async getMyEvents(
    @Query() query: CursorPaginationDto,
  ): Promise<{ events: SpeakerEventResponseDto[]; nextCursor?: string }> {
    const result = await this.eventService.getMyEvents(query.cursor, query.limit);
    return {
      events: result.events.map(mapSpeakerEventToDto),
      nextCursor: result.nextCursor ?? undefined,
    };
  }

  @Get('my/:eventId')
  @UseGuards(SpeakerGuard)
  @ApiOperation({ summary: "Get speaker's specific event" })
  @ApiOkResponse({ type: SpeakerEventResponseDto })
  async getMyEventById(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<SpeakerEventResponseDto> {
    const event = await this.eventService.getMyEventById(eventId);
    return mapSpeakerEventToDto(event);
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Get event details' })
  @ApiOkResponse({ type: EventResponseDto })
  async getEventById(@Param('eventId', ParseUUIDPipe) eventId: string): Promise<EventResponseDto> {
    const event = await this.eventService.getEventById(eventId);
    return mapEventToResponseDto(event);
  }

  @Post()
  @UseGuards(SpeakerGuard)
  @ApiOperation({ summary: 'Create a new event (speakers only)' })
  @ApiCreatedResponse({ type: SpeakerEventResponseDto })
  async createEvent(@Body() dto: CreateEventDto): Promise<SpeakerEventResponseDto> {
    const event = await this.eventService.createEvent(
      dto.name,
      dto.isOnline,
      dto.eventDate,
      dto.location,
      dto.link,
      dto.description,
      dto.imageUrls,
      dto.tags,
      dto.limitParticipants,
    );

    const speakerEvent = await this.eventService.getMyEventById(event.id);
    return mapSpeakerEventToDto(speakerEvent);
  }

  @Patch(':eventId')
  @UseGuards(SpeakerGuard)
  @ApiOperation({ summary: 'Update event (speakers only, own events)' })
  @ApiOkResponse({ type: SpeakerEventResponseDto })
  async updateEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: UpdateEventDto,
  ): Promise<SpeakerEventResponseDto> {
    const currentEvent = await this.eventService.getMyEventById(eventId);

    const event = await this.eventService.updateEvent(
      eventId,
      dto.name ?? currentEvent.name,
      dto.isOnline ?? currentEvent.is_online,
      dto.eventDate ?? currentEvent.event_date.toISOString(),
      dto.location !== undefined ? dto.location : (currentEvent.location ?? undefined),
      dto.link !== undefined ? dto.link : (currentEvent.link ?? undefined),
      dto.description !== undefined ? dto.description : (currentEvent.description ?? undefined),
      dto.imageUrls ?? currentEvent.image_urls,
      dto.tags ?? currentEvent.tags,
      dto.limitParticipants !== undefined
        ? dto.limitParticipants
        : (currentEvent.limit_participants ?? undefined),
    );

    const updatedEvent = await this.eventService.getMyEventById(event.id);
    return mapSpeakerEventToDto(updatedEvent);
  }

  @Delete(':eventId')
  @UseGuards(SpeakerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete event (speakers only, own events)' })
  @ApiNoContentResponse()
  async deleteEvent(@Param('eventId', ParseUUIDPipe) eventId: string): Promise<void> {
    await this.eventService.deleteEvent(eventId);
  }

  @Post(':eventId/register')
  @ApiOperation({ summary: 'Register for an event' })
  @ApiCreatedResponse({ type: RegistrationResponseDto })
  async registerForEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: RegisterForEventDto,
  ): Promise<RegistrationResponseDto> {
    const registration = await this.eventService.registerForEvent(eventId, dto.comment);
    return mapEventRegistrationToDto(registration);
  }

  @Delete(':eventId/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister from an event' })
  @ApiNoContentResponse()
  async unregisterFromEvent(@Param('eventId', ParseUUIDPipe) eventId: string): Promise<void> {
    await this.eventService.unregisterFromEvent(eventId);
  }

  @Get(':eventId/participants')
  @UseGuards(SpeakerGuard)
  @ApiOperation({ summary: "Get participants of speaker's event" })
  @ApiOkResponse({ type: [EventParticipantDto] })
  async getEventParticipants(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<EventParticipantDto[]> {
    const participants = await this.eventService.getEventParticipants(eventId);
    return participants.map(mapEventParticipantToDto);
  }
}
