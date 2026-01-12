import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@/admin-auth/guard/admin-jwt-auth.guard';
import { AdminRolesGuard, RequireAdminRoles } from '@/admin-auth/guard/admin-roles.guard';
import { AnalyticsAdminService } from './analytics.admin.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { YearQueryDto } from './dto/year-query.dto';
import { UserGrowthDataPointDto } from './dto/user-growth.dto';
import { ConnectionActivityDataPointDto } from './dto/connection-activity.dto';
import { ContentEngagementDataPointDto } from './dto/content-engagement.dto';
import { EventInterestDataPointDto } from './dto/event-interest.dto';
import { TopInterestsQueryDto } from './dto/top-interests-query.dto';
import { TopInterestDataPointDto } from './dto/top-interests.dto';
import { UserRetentionDataPointDto } from './dto/user-retention.dto';
import { PlatformOverviewDto } from './dto/platform-overview.dto';
import { SpeakerAnalyticsQueryDto } from './dto/speaker-analytics-query.dto';
import { SpeakerAnalyticsDataPointDto } from './dto/speaker-analytics.dto';

@ApiTags('Admin - Analytics')
@Controller('admin/analytics')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@RequireAdminRoles('owner')
@ApiBearerAuth()
export class AnalyticsAdminController {
  constructor(private readonly analyticsAdminService: AnalyticsAdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get platform overview with key metrics (owner only)' })
  @ApiOkResponse({ type: PlatformOverviewDto })
  async getPlatformOverview(): Promise<PlatformOverviewDto> {
    return this.analyticsAdminService.getPlatformOverview();
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth dynamics over time (owner only)' })
  @ApiOkResponse({ type: [UserGrowthDataPointDto] })
  async getUserGrowth(@Query() query: DateRangeQueryDto): Promise<UserGrowthDataPointDto[]> {
    return this.analyticsAdminService.getUserGrowth(
      query.startDate,
      query.endDate,
      query.interval!,
    );
  }

  @Get('connection-activity')
  @ApiOperation({ summary: 'Get connection request activity over time (owner only)' })
  @ApiOkResponse({ type: [ConnectionActivityDataPointDto] })
  async getConnectionActivity(
    @Query() query: DateRangeQueryDto,
  ): Promise<ConnectionActivityDataPointDto[]> {
    return this.analyticsAdminService.getConnectionActivity(
      query.startDate,
      query.endDate,
      query.interval!,
    );
  }

  @Get('content-engagement')
  @ApiOperation({ summary: 'Get content engagement metrics over time (owner only)' })
  @ApiOkResponse({ type: [ContentEngagementDataPointDto] })
  async getContentEngagement(
    @Query() query: DateRangeQueryDto,
  ): Promise<ContentEngagementDataPointDto[]> {
    return this.analyticsAdminService.getContentEngagement(
      query.startDate,
      query.endDate,
      query.interval!,
    );
  }

  @Get('event-interest')
  @ApiOperation({ summary: 'Get event interest by month for a given year (owner only)' })
  @ApiOkResponse({ type: [EventInterestDataPointDto] })
  async getEventInterest(@Query() query: YearQueryDto): Promise<EventInterestDataPointDto[]> {
    return this.analyticsAdminService.getEventInterest(query.year);
  }

  @Get('top-interests')
  @ApiOperation({ summary: 'Get most popular interests by user count (owner only)' })
  @ApiOkResponse({ type: [TopInterestDataPointDto] })
  async getTopInterests(@Query() query: TopInterestsQueryDto): Promise<TopInterestDataPointDto[]> {
    return this.analyticsAdminService.getTopInterests(query.limit);
  }

  @Get('user-retention')
  @ApiOperation({ summary: 'Get user retention rate over time (owner only)' })
  @ApiOkResponse({ type: [UserRetentionDataPointDto] })
  async getUserRetention(@Query() query: DateRangeQueryDto): Promise<UserRetentionDataPointDto[]> {
    return this.analyticsAdminService.getUserRetention(
      query.startDate,
      query.endDate,
      query.interval!,
    );
  }

  @Get('speaker-analytics')
  @ApiOperation({ summary: 'Get speaker engagement analytics (owner only)' })
  @ApiOkResponse({ type: [SpeakerAnalyticsDataPointDto] })
  async getSpeakerAnalytics(
    @Query() query: SpeakerAnalyticsQueryDto,
  ): Promise<SpeakerAnalyticsDataPointDto[]> {
    return this.analyticsAdminService.getSpeakerAnalytics(query.limit);
  }
}
