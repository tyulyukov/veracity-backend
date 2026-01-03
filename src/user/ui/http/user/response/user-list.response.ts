import { ApiProperty } from '@nestjs/swagger';
import { UserListOutput } from '@/user/operation/user/output/user-list.output';
import { UserResponseDto } from './user.response';

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  users: UserResponseDto[];

  static fromOutput(output: UserListOutput): UserListResponseDto {
    const response = new UserListResponseDto();
    response.users = output.users.map((u) => {
      const userResponse = new UserResponseDto();
      userResponse.id = u.id;
      userResponse.email = u.email;
      userResponse.firstName = u.firstName;
      userResponse.lastName = u.lastName;
      userResponse.avatarUrl = u.avatarUrl;
      userResponse.position = u.position;
      userResponse.contactInfo = u.contactInfo;
      userResponse.shortDescription = u.shortDescription;
      userResponse.status = u.status;
      userResponse.createdAt = u.createdAt;
      userResponse.lastActivityAt = u.lastActivityAt;
      return userResponse;
    });
    return response;
  }
}
