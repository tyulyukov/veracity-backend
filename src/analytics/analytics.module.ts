import { Module } from '@nestjs/common';
import { AdminAuthModule } from '@/admin-auth/admin-auth.module';
import { AnalyticsAdminController } from './analytics.admin.controller';
import { AnalyticsAdminService } from './analytics.admin.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [AnalyticsAdminController],
  providers: [AnalyticsAdminService],
})
export class AnalyticsModule {}
