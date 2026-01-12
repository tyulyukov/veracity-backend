import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { EventModule } from '@/event/event.module';
import { ContentModule } from '@/content/content.module';

@Module({
  imports: [EventModule, ContentModule],
  controllers: [StorageController],
})
export class StorageFeatureModule {}
