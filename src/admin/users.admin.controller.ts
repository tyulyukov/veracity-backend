import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@/admin-auth/guard/admin-jwt-auth.guard';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { mapUserToDto } from '@/user/user.mapper';
import { UsersAdminService } from './users.admin.service';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserEventRelationDto } from './dto/user-event-relation.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination.dto';

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth()
export class UsersAdminController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get users (offset-based pagination, optional status filter)' })
  @ApiOkResponse({ description: 'Paginated list of users' })
  async findUsers(
    @Query() query: UsersQueryDto,
  ): Promise<{ users: UserResponseDto[]; total: number }> {
    const result = await this.usersAdminService.findUsers(query);
    return {
      users: result.users.map(mapUserToDto),
      total: result.total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersAdminService.findUserById(id);
    return mapUserToDto(user);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update user status (approve/reject)' })
  @ApiNoContentResponse()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<void> {
    await this.usersAdminService.updateUserStatus(id, dto);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update user role (standard_user/speaker)' })
  @ApiNoContentResponse()
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<void> {
    await this.usersAdminService.updateUserRole(id, dto);
  }

  @Get(':id/events')
  @ApiOperation({ summary: "Get user's event relations (created events and registrations)" })
  @ApiOkResponse({ description: 'Paginated list of user event relations' })
  async getUserEventRelations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: OffsetPaginationDto,
  ): Promise<{ events: UserEventRelationDto[]; total: number }> {
    const result = await this.usersAdminService.getUserEventRelations(
      id,
      query.offset,
      query.limit,
    );
    return {
      events: result.events.map((relation) => ({
        userId: relation.user_id,
        eventRelationType: relation.event_relation_type,
        eventId: relation.event_id,
        name: relation.name,
        isOnline: relation.is_online,
        eventDate: relation.event_date,
        location: relation.location,
        link: relation.link,
        description: relation.description,
        imageUrls: relation.image_urls,
        tags: relation.tags,
        limitParticipants: relation.limit_participants,
        participantCount: relation.participant_count,
        createdAt: relation.created_at,
        registrationComment: relation.registration_comment,
        registrationCreatedAt: relation.registration_created_at,
      })),
      total: result.total,
    };
  }
}
