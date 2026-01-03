import { Injectable } from '@nestjs/common';
import { UserService } from '../../../service/user/service/user.service';
import { DeleteUserInput } from '../input/get-user.input';

@Injectable()
export class DeleteUserHandler {
  constructor(private readonly userService: UserService) {}

  async handle(input: DeleteUserInput): Promise<void> {
    await this.userService.delete(input.id);
  }
}

