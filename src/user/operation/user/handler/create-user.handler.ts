import { Injectable } from '@nestjs/common';
import { UserService } from '@/user/service/user/service/user.service';
import { CreateUserInput } from '@/user/operation/user/input/create-user.input';
import { UserOutput } from '@/user/operation/user/output/user.output';

@Injectable()
export class CreateUserHandler {
  constructor(private readonly userService: UserService) {}

  async handle(input: CreateUserInput): Promise<UserOutput> {
    return await this.userService.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: input.avatarUrl,
      position: input.position,
      contactInfo: input.contactInfo,
      shortDescription: input.shortDescription,
      status: input.status,
    });
  }
}
