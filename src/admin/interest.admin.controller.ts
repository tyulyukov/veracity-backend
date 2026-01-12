import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AdminJwtAuthGuard } from '@/admin-auth/guard/admin-jwt-auth.guard';
import { InterestAdminService, Interest } from './interest.admin.service';
import { CreateInterestDto } from './dto/create-interest.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { InterestDto } from './dto/interest.dto';
import { InterestsQueryDto } from './dto/interests-query.dto';

@ApiTags('Admin - Interests')
@Controller('admin/interests')
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth()
export class InterestAdminController {
  constructor(private readonly interestAdminService: InterestAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get all interests (offset pagination)' })
  @ApiOkResponse({ description: 'Paginated list of interests' })
  async findInterests(
    @Query() query: InterestsQueryDto,
  ): Promise<{ interests: InterestDto[]; total: number }> {
    const result = await this.interestAdminService.findInterests(query);
    return {
      interests: result.interests.map((i) => this.mapToDto(i)),
      total: result.total,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new interest' })
  @ApiCreatedResponse({ type: InterestDto })
  async createInterest(@Body() dto: CreateInterestDto): Promise<InterestDto> {
    const interest = await this.interestAdminService.createInterest(dto);
    return this.mapToDto(interest);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update an interest' })
  @ApiNoContentResponse({ description: 'Interest updated' })
  async updateInterest(@Param('id') id: string, @Body() dto: UpdateInterestDto): Promise<void> {
    await this.interestAdminService.updateInterest(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an interest' })
  @ApiNoContentResponse({ description: 'Interest deleted' })
  async deleteInterest(@Param('id') id: string): Promise<void> {
    await this.interestAdminService.deleteInterest(id);
  }

  private mapToDto(interest: Interest): InterestDto {
    return {
      id: interest.id,
      name: interest.name,
    };
  }
}
