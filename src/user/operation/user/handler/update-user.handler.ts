import { Injectable } from '@nestjs/common';
import { UserService } from '@/user/service/user/service/user.service';
import { UpdateUserInput } from '@/user/operation/user/input/update-user.input';
import { UserOutput } from '@/user/operation/user/output/user.output';

@Injectable()
export class UpdateUserHandler {
  constructor(private readonly userService: UserService) {}

  async handle(input: UpdateUserInput): Promise<UserOutput> {
    const { id, ...data } = input;
    return this.userService.update(id, data);
  }
}
