import { StorageField } from './storage-path.builder';

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface ImageProcessingConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: ImageFormat;
  allowedMimeTypes: string[];
}

export const IMAGE_PROCESSING_CONFIGS: Record<StorageField, ImageProcessingConfig> = {
  avatar: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 85,
    format: 'jpeg',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  event_image: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 90,
    format: 'jpeg',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  post_image: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 85,
    format: 'jpeg',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
};

export function getImageProcessingConfig(field: StorageField): ImageProcessingConfig {
  return IMAGE_PROCESSING_CONFIGS[field];
}

export function getOutputMimeType(format: ImageFormat): string {
  const mimeTypes: Record<ImageFormat, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return mimeTypes[format];
}
