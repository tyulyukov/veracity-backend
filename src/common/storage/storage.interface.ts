import { StorageEntity, StorageField } from './storage-path.builder';

export interface UploadFileParams {
  entity: StorageEntity;
  entityId: string;
  field: StorageField;
  filename: string;
  buffer: Buffer;
  contentType: string;
}

export interface UploadFileResult {
  path: string;
}

export interface StorageProvider {
  uploadFile(params: UploadFileParams): Promise<UploadFileResult>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
