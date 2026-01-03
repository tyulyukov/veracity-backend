import { Injectable } from '@nestjs/common';
import { UserService } from '../../../service/user/service/user.service';
import { UpdateUserInput } from '../input/update-user.input';
import { UserOutput } from '../output/user.output';

@Injectable()
export class UpdateUserHandler {
  constructor(private readonly userService: UserService) {}

  async handle(input: UpdateUserInput): Promise<UserOutput> {
    const { id, ...data } = input;
    return this.userService.update(id, data);
  }
}
