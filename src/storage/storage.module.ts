import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { EventModule } from '@/event/event.module';

@Module({
  imports: [EventModule],
  controllers: [StorageController],
})
export class StorageFeatureModule {}
