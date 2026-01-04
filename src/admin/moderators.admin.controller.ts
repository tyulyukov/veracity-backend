import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AdminJwtAuthGuard } from '@/admin-auth/guard/admin-jwt-auth.guard';
import { AdminRolesGuard, RequireAdminRoles } from '@/admin-auth/guard/admin-roles.guard';
import { CurrentAdmin, CurrentAdminPayload } from '@/common/decorator/current-admin.decorator';
import { ModeratorsAdminService, ModeratorInfo } from './moderators.admin.service';
import { CreateModeratorDto } from './dto/create-moderator.dto';
import { ModeratorsQueryDto } from './dto/moderators-query.dto';
import { ModeratorInfoDto } from './dto/moderator-info.dto';

@ApiTags('Admin - Moderators')
@Controller('admin')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@ApiBearerAuth()
export class ModeratorsAdminController {
  constructor(private readonly moderatorsAdminService: ModeratorsAdminService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current admin info' })
  @ApiOkResponse({ type: ModeratorInfoDto })
  getMe(@CurrentAdmin() admin: CurrentAdminPayload): ModeratorInfoDto {
    return { email: admin.email, role: admin.role };
  }

  @Get('moderators')
  @RequireAdminRoles('owner')
  @ApiOperation({ summary: 'Get all moderators (owner only, offset pagination)' })
  @ApiOkResponse({ description: 'Paginated list of moderators' })
  async findModerators(
    @Query() query: ModeratorsQueryDto,
  ): Promise<{ moderators: ModeratorInfo[]; total: number }> {
    return this.moderatorsAdminService.findModerators(query);
  }

  @Post('moderators')
  @RequireAdminRoles('owner')
  @ApiOperation({ summary: 'Create a moderator (owner only)' })
  @ApiCreatedResponse({ type: ModeratorInfoDto })
  async createModerator(@Body() dto: CreateModeratorDto): Promise<ModeratorInfoDto> {
    return this.moderatorsAdminService.createModerator(dto);
  }

  @Delete('moderators/:email')
  @RequireAdminRoles('owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a moderator (owner only)' })
  @ApiNoContentResponse({ description: 'Moderator deleted' })
  async deleteModerator(@Param('email') email: string): Promise<void> {
    await this.moderatorsAdminService.deleteModerator(email);
  }
}
