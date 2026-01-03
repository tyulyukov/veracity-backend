import { Injectable } from '@nestjs/common';
import { UserService } from '../../../service/user/service/user.service';
import { GetUserInput } from '../input/get-user.input';
import { UserOutput } from '../output/user.output';

@Injectable()
export class GetUserHandler {
  constructor(private readonly userService: UserService) {}

  async handle(input: GetUserInput): Promise<UserOutput> {
    return this.userService.findById(input.id);
  }
}
