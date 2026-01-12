import { ApiProperty } from '@nestjs/swagger';

export class EventInterestDataPointDto {
  @ApiProperty({ description: 'Month (1-12)' })
  month: number;

  @ApiProperty({ description: 'Number of event registrations' })
  registrationsCount: number;

  @ApiProperty({ description: 'Number of events created' })
  eventsCount: number;
}
