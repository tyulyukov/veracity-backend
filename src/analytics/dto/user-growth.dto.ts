import { ApiProperty } from '@nestjs/swagger';

export class UserGrowthDataPointDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Number of users registered by this date' })
  userCount: number;
}
