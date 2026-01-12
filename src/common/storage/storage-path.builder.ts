import { Environment } from '@/common/config/env.validation';

export type StorageEntity = 'users' | 'events' | 'posts';
export type StorageField = 'avatar' | 'event_image' | 'post_image';

export interface StoragePathParams {
  env: Environment;
  entity: StorageEntity;
  entityId: string;
  field: StorageField;
  filename: string;
}

export function buildStoragePath(params: StoragePathParams): string {
  return `${params.env}/${params.entity}/${params.entityId}/${params.field}/${params.filename}`;
}
