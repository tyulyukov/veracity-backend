import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserJwtAuthGuard } from '@/user-auth/guard/user-jwt-auth.guard';
import { ActiveUserGuard } from '@/user-auth/guard/user-status.guard';
import { ConnectionService } from './connection.service';
import { ConnectionResponseDto } from './dto/connection-response.dto';
import { RespondConnectionDto } from './dto/respond-connection.dto';
import { ConnectionsQueryDto } from './dto/connections-query.dto';
import { PaginatedConnectionsResponseDto } from './dto/connected-user-response.dto';
import {
  mapConnectionToDto,
  mapConnectionWithAutoApprovalToDto,
  mapConnectedUserToDto,
} from './connection.mapper';

@ApiTags('Connections')
@Controller('connections')
@UseGuards(UserJwtAuthGuard, ActiveUserGuard)
@ApiBearerAuth()
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get approved connections for a user' })
  @ApiOkResponse({ type: PaginatedConnectionsResponseDto })
  async getApprovedConnections(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: ConnectionsQueryDto,
  ): Promise<PaginatedConnectionsResponseDto> {
    const result = await this.connectionService.getApprovedConnections(
      userId,
      query.cursor,
      query.limit,
    );
    return {
      users: result.users.map(mapConnectedUserToDto),
      nextCursor: result.nextCursor,
    };
  }

  @Post(':targetUserId')
  @ApiOperation({
    summary: 'Send connection request (auto-approves if mutual pending request exists)',
  })
  @ApiCreatedResponse({ type: ConnectionResponseDto })
  async sendConnectionRequest(
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ): Promise<ConnectionResponseDto> {
    const connection = await this.connectionService.sendConnectionRequest(targetUserId);
    return mapConnectionWithAutoApprovalToDto(connection);
  }

  @Delete(':targetUserId')
  @ApiOperation({ summary: 'Delete my pending connection request' })
  @ApiNoContentResponse()
  async deleteConnectionRequest(
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ): Promise<void> {
    await this.connectionService.deleteConnectionRequest(targetUserId);
  }

  @Delete(':otherUserId/connection')
  @ApiOperation({ summary: 'Delete connection (disconnect)' })
  @ApiNoContentResponse({ description: 'Connection deleted successfully' })
  async deleteConnection(@Param('otherUserId', ParseUUIDPipe) otherUserId: string): Promise<void> {
    await this.connectionService.deleteConnection(otherUserId);
  }

  @Patch(':requesterId/respond')
  @ApiOperation({ summary: 'Respond to incoming connection request' })
  @ApiOkResponse({ type: ConnectionResponseDto })
  async respondToConnection(
    @Param('requesterId', ParseUUIDPipe) requesterId: string,
    @Body() dto: RespondConnectionDto,
  ): Promise<ConnectionResponseDto> {
    const connection = await this.connectionService.respondToConnection(requesterId, dto.response);
    return mapConnectionToDto(connection);
  }
}
