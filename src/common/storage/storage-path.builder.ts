import { Environment } from '@/common/config/env.validation';

export type StorageEntity = 'users';
export type StorageField = 'avatar';

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
