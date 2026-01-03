import { Module } from '@nestjs/common';
import { UserOperationModule } from './operation/operation.module';
import { UserController } from './ui/http/user/user.controller';

@Module({
  imports: [UserOperationModule],
  controllers: [UserController],
})
export class UserModule {}

