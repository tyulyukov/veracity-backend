import { Injectable } from '@nestjs/common';
import { UserService } from '@/user/service/user/service/user.service';
import { DeleteUserInput } from '@/user/operation/user/input/get-user.input';

@Injectable()
export class DeleteUserHandler {
  constructor(private readonly userService: UserService) {}

  async handle(input: DeleteUserInput): Promise<void> {
    await this.userService.delete(input.id);
  }
}
