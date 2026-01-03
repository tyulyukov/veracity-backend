import { Module } from '@nestjs/common';
import { UserServiceModule } from '../service/service.module';
import { CreateUserHandler } from './user/handler/create-user.handler';
import { DeleteUserHandler } from './user/handler/delete-user.handler';
import { GetUserHandler } from './user/handler/get-user.handler';
import { ListUsersHandler } from './user/handler/list-users.handler';
import { UpdateUserHandler } from './user/handler/update-user.handler';

@Module({
  imports: [UserServiceModule],
  providers: [
    CreateUserHandler,
    GetUserHandler,
    ListUsersHandler,
    UpdateUserHandler,
    DeleteUserHandler,
  ],
  exports: [
    CreateUserHandler,
    GetUserHandler,
    ListUsersHandler,
    UpdateUserHandler,
    DeleteUserHandler,
  ],
})
export class UserOperationModule {}

