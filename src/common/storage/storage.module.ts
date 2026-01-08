import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage.interface';
import { R2StorageProvider, StorageService } from './storage.service';
import { ImageProcessorService } from './image-processor.service';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: R2StorageProvider,
    },
    StorageService,
    ImageProcessorService,
  ],
  exports: [StorageService, STORAGE_PROVIDER, ImageProcessorService],
})
export class StorageModule {}
