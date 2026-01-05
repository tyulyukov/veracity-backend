import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserJwtAuthGuard } from '@/user-auth/guard/user-jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorator/current-user.decorator';
import { StorageService } from '@/common/storage/storage.service';
import { UploadUrlRequestDto } from '@/common/storage/dto/upload-url-request.dto';
import { UploadUrlResponseDto } from '@/common/storage/dto/upload-url-response.dto';
import { ForbiddenEntityAccessError } from './domain/forbidden-entity-access.error';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @UseGuards(UserJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate presigned URL for file upload' })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  async getUploadUrl(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: UploadUrlRequestDto,
  ): Promise<UploadUrlResponseDto> {
    if (dto.entity === 'users' && dto.entityId !== currentUser.userId) {
      throw new ForbiddenEntityAccessError();
    }

    return this.storageService.generateUploadUrl({
      entity: dto.entity,
      entityId: dto.entityId,
      field: dto.field,
      filename: dto.filename,
      contentType: dto.contentType,
    });
  }
}
