import { ApiProperty } from '@nestjs/swagger';

export class ConnectionActivityDataPointDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Number of connection requests sent' })
  sentCount: number;

  @ApiProperty({ description: 'Number of connection requests accepted' })
  acceptedCount: number;

  @ApiProperty({ description: 'Number of connection requests rejected' })
  rejectedCount: number;
}
