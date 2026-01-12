import { Module } from '@nestjs/common';
import { AdminAuthModule } from '@/admin-auth/admin-auth.module';
import { UsersAdminController } from './users.admin.controller';
import { UsersAdminService } from './users.admin.service';
import { ModeratorsAdminController } from './moderators.admin.controller';
import { ModeratorsAdminService } from './moderators.admin.service';
import { ContentAdminController } from './content.admin.controller';
import { ContentAdminService } from './content.admin.service';
import { InterestAdminController } from './interest.admin.controller';
import { InterestAdminService } from './interest.admin.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [
    UsersAdminController,
    ModeratorsAdminController,
    ContentAdminController,
    InterestAdminController,
  ],
  providers: [
    UsersAdminService,
    ModeratorsAdminService,
    ContentAdminService,
    InterestAdminService,
  ],
})
export class AdminModule {}
