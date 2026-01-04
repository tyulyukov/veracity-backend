import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserService } from './user.service';
import { UserAuthModule } from '@/user-auth/user-auth.module';

@Module({
  imports: [UserAuthModule],
  controllers: [UsersController],
  providers: [UserService],
})
export class UserModule {}
