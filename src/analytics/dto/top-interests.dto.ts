import { ApiProperty } from '@nestjs/swagger';

export class TopInterestDataPointDto {
  @ApiProperty({ description: 'Interest ID' })
  interestId: string;

  @ApiProperty({ description: 'Interest name' })
  interestName: string;

  @ApiProperty({ description: 'Number of users with this interest' })
  userCount: number;
}
