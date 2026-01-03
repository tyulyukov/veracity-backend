import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/user/domain/entity/user.entity';
import { UserRepository } from './user/repository/user.repository';
import { UserService } from './user/service/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserServiceModule {}
