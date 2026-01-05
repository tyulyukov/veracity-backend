import { StorageEntity, StorageField } from './storage-path.builder';

export interface GenerateUploadUrlParams {
  entity: StorageEntity;
  entityId: string;
  field: StorageField;
  filename: string;
  contentType: string;
}

export interface UploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
}

export interface StorageProvider {
  generateUploadUrl(params: GenerateUploadUrlParams): Promise<UploadUrlResult>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
