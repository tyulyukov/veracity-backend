import { ApiProperty } from '@nestjs/swagger';

export class PlatformOverviewDto {
  @ApiProperty({ description: 'Total registered users' })
  totalUsers: number;

  @ApiProperty({ description: 'Active users count' })
  activeUsers: number;

  @ApiProperty({ description: 'Pending users count' })
  pendingUsers: number;

  @ApiProperty({ description: 'Total approved connections' })
  totalConnections: number;

  @ApiProperty({ description: 'Pending connection requests' })
  pendingConnections: number;

  @ApiProperty({ description: 'Average connections per active user' })
  avgConnectionsPerUser: number;

  @ApiProperty({ description: 'Total posts created' })
  totalPosts: number;

  @ApiProperty({ description: 'Total likes given' })
  totalLikes: number;

  @ApiProperty({ description: 'Total comments made' })
  totalComments: number;

  @ApiProperty({ description: 'Total events created' })
  totalEvents: number;

  @ApiProperty({ description: 'Total event registrations' })
  totalEventRegistrations: number;

  @ApiProperty({ description: 'Total speakers count' })
  totalSpeakers: number;
}
