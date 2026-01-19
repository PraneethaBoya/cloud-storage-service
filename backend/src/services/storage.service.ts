import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { S3Client, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let supabaseClient: any = null;
let s3Client: S3Client | null = null;

// Initialize Supabase client
if (config.supabaseUrl && config.supabaseServiceKey) {
  supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceKey);
}

// Initialize S3 client
if (config.awsRegion && config.awsAccessKeyId && config.awsSecretAccessKey) {
  s3Client = new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });
}

export interface UploadPart {
  partNumber: number;
  uploadUrl: string;
}

export interface PresignedUploadResponse {
  uploadId?: string;
  parts: UploadPart[];
  completeUrl: string;
}

/**
 * Generate presigned URLs for multipart upload
 */
export async function generatePresignedUploadUrls(
  fileKey: string,
  mimeType: string,
  fileSize: number,
  partCount: number
): Promise<PresignedUploadResponse> {
  if (supabaseClient) {
    return generateSupabasePresignedUrls(fileKey, mimeType, fileSize, partCount);
  } else if (s3Client) {
    return generateS3PresignedUrls(fileKey, mimeType, fileSize, partCount);
  } else {
    throw new AppError('STORAGE_NOT_CONFIGURED', 'Storage service not configured', 500);
  }
}

async function generateSupabasePresignedUrls(
  fileKey: string,
  mimeType: string,
  fileSize: number,
  partCount: number
): Promise<PresignedUploadResponse> {
  const bucket = config.supabaseStorageBucket;
  const parts: UploadPart[] = [];

  // Supabase Storage doesn't support multipart uploads natively
  // We'll generate a single presigned URL for the entire file
  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .createSignedUploadUrl(fileKey, {
      upsert: true,
    });

  if (error) {
    throw new AppError('STORAGE_ERROR', `Failed to generate upload URL: ${error.message}`, 500);
  }

  // For simplicity, return a single part
  parts.push({
    partNumber: 1,
    uploadUrl: data.signedUrl,
  });

  return {
    parts,
    completeUrl: `/api/files/complete`,
  };
}

async function generateS3PresignedUrls(
  fileKey: string,
  mimeType: string,
  fileSize: number,
  partCount: number
): Promise<PresignedUploadResponse> {
  if (!s3Client) {
    throw new AppError('STORAGE_NOT_CONFIGURED', 'S3 not configured', 500);
  }

  const { CreateMultipartUploadCommand } = await import('@aws-sdk/client-s3');
  
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: config.awsS3Bucket,
    Key: fileKey,
    ContentType: mimeType,
  });

  const { UploadId } = await s3Client.send(createCommand);

  if (!UploadId) {
    throw new AppError('STORAGE_ERROR', 'Failed to create multipart upload', 500);
  }

  const parts: UploadPart[] = [];
  const partSize = Math.ceil(fileSize / partCount);

  for (let i = 1; i <= partCount; i++) {
    const { UploadPartCommand } = await import('@aws-sdk/client-s3');
    const command = new UploadPartCommand({
      Bucket: config.awsS3Bucket,
      Key: fileKey,
      PartNumber: i,
      UploadId,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    parts.push({
      partNumber: i,
      uploadUrl,
    });
  }

  return {
    uploadId: UploadId,
    parts,
    completeUrl: `/api/files/complete`,
  };
}

/**
 * Generate presigned URL for download
 */
export async function generatePresignedDownloadUrl(
  fileKey: string,
  bucket: string,
  expiresIn: number = 3600
): Promise<string> {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(fileKey, expiresIn);

    if (error) {
      throw new AppError('STORAGE_ERROR', `Failed to generate download URL: ${error.message}`, 500);
    }

    return data.signedUrl;
  } else if (s3Client) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: fileKey,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  } else {
    throw new AppError('STORAGE_NOT_CONFIGURED', 'Storage service not configured', 500);
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(fileKey: string, bucket: string): Promise<void> {
  if (supabaseClient) {
    const { error } = await supabaseClient.storage
      .from(bucket)
      .remove([fileKey]);

    if (error) {
      throw new AppError('STORAGE_ERROR', `Failed to delete file: ${error.message}`, 500);
    }
  } else if (s3Client) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: fileKey,
    });

    await s3Client.send(command);
  } else {
    throw new AppError('STORAGE_NOT_CONFIGURED', 'Storage service not configured', 500);
  }
}
