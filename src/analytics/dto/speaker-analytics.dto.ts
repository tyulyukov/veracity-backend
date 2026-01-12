import { ApiProperty } from '@nestjs/swagger';

export class SpeakerAnalyticsDataPointDto {
  @ApiProperty({ description: 'Speaker user ID' })
  speakerId: string;

  @ApiProperty({ description: 'Speaker first name' })
  firstName: string;

  @ApiProperty({ description: 'Speaker last name' })
  lastName: string;

  @ApiProperty({ description: 'Number of events created by this speaker' })
  eventsCount: number;

  @ApiProperty({ description: 'Total registrations across all events' })
  totalRegistrations: number;

  @ApiProperty({ description: 'Average registrations per event' })
  avgRegistrationsPerEvent: number;
}
