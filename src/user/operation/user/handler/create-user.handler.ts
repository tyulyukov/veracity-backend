import { Injectable } from '@nestjs/common';
import { UserService } from '@/user/service/user/service/user.service';
import { CreateUserInput } from '../input/create-user.input';
import { UserOutput } from '../output/user.output';

@Injectable()
export class CreateUserHandler {
  constructor(private readonly userService: UserService) {}

  async handle(input: CreateUserInput): Promise<UserOutput> {
    const user = await this.userService.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: input.avatarUrl,
      position: input.position,
      contactInfo: input.contactInfo,
      shortDescription: input.shortDescription,
      status: input.status,
    });
    return user;
  }
}
