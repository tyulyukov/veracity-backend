import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InterestService, Interest } from './interest.service';

@ApiTags('Interests')
@Controller('interests')
export class InterestController {
  constructor(private readonly interestService: InterestService) {}

  @Get()
  @ApiOperation({ summary: 'Get all interests' })
  @ApiOkResponse({ description: 'List of interests' })
  async findAll(): Promise<Interest[]> {
    return this.interestService.findAll();
  }
}
