import { Injectable } from '@nestjs/common';
import { User } from '@/user/domain/entity/user.entity';
import { UserNotFoundError } from '@/user/domain/error/user-not-found.error';
import { UserRepository } from '@/user/user.repository';
import { UpdateUserDto } from '@/user/dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(data: Partial<User>): Promise<User> {
    return this.userRepository.create(data);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  async findByIdOrNull(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const exists = await this.userRepository.exists(id);
    if (!exists) {
      throw new UserNotFoundError(id);
    }
    const { lastActivityAt, ...rest } = dto;
    const data: Partial<User> = { ...rest };
    if (lastActivityAt !== undefined) {
      data.lastActivityAt = lastActivityAt ? new Date(lastActivityAt) : null;
    }
    const updated = await this.userRepository.update(id, data);
    if (!updated) {
      throw new UserNotFoundError(id);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new UserNotFoundError(id);
    }
  }
}
