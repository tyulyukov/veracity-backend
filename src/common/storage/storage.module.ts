import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage.interface';
import { R2StorageProvider, StorageService } from './storage.service';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: R2StorageProvider,
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}

