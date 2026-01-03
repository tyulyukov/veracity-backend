import { Injectable } from '@nestjs/common';
import { UserService } from '@/user/service/user/service/user.service';
import { GetUserInput } from '@/user/operation/user/input/get-user.input';
import { UserOutput } from '@/user/operation/user/output/user.output';

@Injectable()
export class GetUserHandler {
  constructor(private readonly userService: UserService) {}

  async handle(input: GetUserInput): Promise<UserOutput> {
    return this.userService.findById(input.id);
  }
}
