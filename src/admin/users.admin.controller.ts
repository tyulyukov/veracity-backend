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
}
