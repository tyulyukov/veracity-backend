import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserJwtAuthGuard } from '@/user-auth/guard/user-jwt-auth.guard';
import { ActiveUserGuard } from '@/user-auth/guard/user-status.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorator/current-user.decorator';
import { UserService } from './user.service';
import { UserResponseDto } from './dto/user-response.dto';
import { OtherUserResponseDto } from './dto/other-user-response.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { mapUserToDto, mapOtherUserToDto } from './user.mapper';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(UserJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async getMe(@CurrentUser() currentUser: CurrentUserPayload): Promise<UserResponseDto> {
    const user = await this.userService.findById(currentUser.userId);
    return mapUserToDto(user);
  }

  @Patch('me')
  @UseGuards(UserJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateMe(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: UpdateMeDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.update(dto);
    return mapUserToDto(user);
  }

  @Get()
  @UseGuards(UserJwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active users (cursor-based pagination)' })
  @ApiOkResponse({ description: 'Paginated list of active users' })
  async findAll(
    @Query() query: UsersQueryDto,
  ): Promise<{ users: OtherUserResponseDto[]; nextCursor: string | null }> {
    const result = await this.userService.findActiveUsers(query);
    return {
      users: result.users.map(mapOtherUserToDto),
      nextCursor: result.nextCursor,
    };
  }
}
