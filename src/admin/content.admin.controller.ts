import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@/admin-auth/guard/admin-jwt-auth.guard';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination.dto';
import { ContentAdminService } from './content.admin.service';
import { AdminPostDto } from './dto/admin-post.dto';
import { UserActivityDto } from './dto/user-activity.dto';

@ApiTags('Admin - Content')
@Controller('admin/users/:userId')
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth()
export class ContentAdminController {
  constructor(private readonly contentAdminService: ContentAdminService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Get user posts (including soft-deleted)' })
  @ApiOkResponse({ description: 'Paginated list of user posts' })
  async getUserPosts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: OffsetPaginationDto,
  ): Promise<{ posts: AdminPostDto[]; total: number }> {
    const result = await this.contentAdminService.getUserPosts(userId, query.offset, query.limit);
    return {
      posts: result.posts.map((post) => ({
        id: post.id,
        text: post.text,
        imageUrls: post.image_urls,
        likeCount: post.like_count,
        commentCount: post.comment_count,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        deletedAt: post.deleted_at,
        author: {
          id: post.author_id,
          email: post.author_email,
          firstName: post.author_first_name,
          lastName: post.author_last_name,
          avatarUrl: post.author_avatar_url,
          role: post.author_role,
        },
      })),
      total: result.total,
    };
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get user content activity feed' })
  @ApiOkResponse({ description: 'Paginated list of user activity' })
  async getUserActivity(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: OffsetPaginationDto,
  ): Promise<{ activities: UserActivityDto[]; total: number }> {
    const result = await this.contentAdminService.getUserActivity(
      userId,
      query.offset,
      query.limit,
    );
    return {
      activities: result.activities.map((activity) => ({
        userId: activity.user_id,
        activityType: activity.activity_type,
        entityId: activity.entity_id,
        entityType: activity.entity_type,
        contentPreview: activity.content_preview,
        imageUrls: activity.image_urls,
        activityAt: activity.activity_at,
      })),
      total: result.total,
    };
  }
}
