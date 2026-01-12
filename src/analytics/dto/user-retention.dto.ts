import { ApiProperty } from '@nestjs/swagger';

export class UserRetentionDataPointDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Number of active users (with activity in period)' })
  activeUsers: number;

  @ApiProperty({ description: 'Total registered users by this date' })
  totalUsers: number;

  @ApiProperty({ description: 'Retention rate (activeUsers / totalUsers * 100)' })
  retentionRate: number;
}
