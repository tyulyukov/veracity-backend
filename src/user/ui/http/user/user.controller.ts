import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserHandler } from '@/user/operation/user/handler/create-user.handler';
import { DeleteUserHandler } from '@/user/operation/user/handler/delete-user.handler';
import { GetUserHandler } from '@/user/operation/user/handler/get-user.handler';
import { ListUsersHandler } from '@/user/operation/user/handler/list-users.handler';
import { UpdateUserHandler } from '@/user/operation/user/handler/update-user.handler';
import { CreateUserRequestDto } from './request/create-user.request';
import { UpdateUserRequestDto } from './request/update-user.request';
import { UserListResponseDto } from './response/user-list.response';
import { UserResponseDto } from './response/user.response';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly createUserHandler: CreateUserHandler,
    private readonly getUserHandler: GetUserHandler,
    private readonly listUsersHandler: ListUsersHandler,
    private readonly updateUserHandler: UpdateUserHandler,
    private readonly deleteUserHandler: DeleteUserHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ type: UserResponseDto, description: 'User created successfully' })
  async create(@Body() request: CreateUserRequestDto): Promise<UserResponseDto> {
    const output = await this.createUserHandler.handle(request.toInput());
    return UserResponseDto.fromOutput(output);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ type: UserListResponseDto, description: 'List of users' })
  async findAll(): Promise<UserListResponseDto> {
    const output = await this.listUsersHandler.handle();
    return UserListResponseDto.fromOutput(output);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ type: UserResponseDto, description: 'User found' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const output = await this.getUserHandler.handle({ id });
    return UserResponseDto.fromOutput(output);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiOkResponse({ type: UserResponseDto, description: 'User updated successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateUserRequestDto,
  ): Promise<UserResponseDto> {
    const output = await this.updateUserHandler.handle(request.toInput(id));
    return UserResponseDto.fromOutput(output);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteUserHandler.handle({ id });
  }
}
