import { Module } from '@nestjs/common';
import { AdminAuthModule } from '@/admin-auth/admin-auth.module';
import { UsersAdminController } from './users.admin.controller';
import { UsersAdminService } from './users.admin.service';
import { ModeratorsAdminController } from './moderators.admin.controller';
import { ModeratorsAdminService } from './moderators.admin.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [UsersAdminController, ModeratorsAdminController],
  providers: [UsersAdminService, ModeratorsAdminService],
})
export class AdminModule {}
