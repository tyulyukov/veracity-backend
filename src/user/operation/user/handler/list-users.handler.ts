import { Injectable } from '@nestjs/common';
import { UserService } from '@/user/service/user/service/user.service';
import { UserListOutput } from '@/user/operation/user/output/user-list.output';

@Injectable()
export class ListUsersHandler {
  constructor(private readonly userService: UserService) {}

  async handle(): Promise<UserListOutput> {
    const users = await this.userService.findAll();
    return { users };
  }
}
