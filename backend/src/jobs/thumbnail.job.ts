import { Queue, Worker } from 'bullmq';
import { config } from '../config/index.js';
import { query } from '../db/index.js';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize storage clients
let supabaseClient: any = null;
let s3Client: S3Client | null = null;

if (config.supabaseUrl && config.supabaseServiceKey) {
  supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceKey);
}

if (config.awsRegion && config.awsAccessKeyId && config.awsSecretAccessKey) {
  s3Client = new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });
}

export const thumbnailQueue = new Queue('thumbnails', {
  connection: {
    host: config.redisUrl.includes('://') 
      ? new URL(config.redisUrl).hostname 
      : 'localhost',
    port: config.redisUrl.includes('://')
      ? parseInt(new URL(config.redisUrl).port) || 6379
      : 6379,
  },
});

export const thumbnailWorker = new Worker(
  'thumbnails',
  async (job) => {
    const { fileId } = job.data;

    // Get file info
    const fileResult = await query(
      'SELECT storage_key, storage_bucket, mime_type FROM files WHERE id = $1',
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const file = fileResult.rows[0];

    if (!file.mime_type?.startsWith('image/')) {
      return { skipped: true, reason: 'Not an image' };
    }

    // Download original image
    let imageBuffer: Buffer;

    if (supabaseClient) {
      const { data, error } = await supabaseClient.storage
        .from(file.storage_bucket)
        .download(file.storage_key);

      if (error) {
        throw new Error(`Failed to download image: ${error.message}`);
      }

      imageBuffer = Buffer.from(await data.arrayBuffer());
    } else if (s3Client) {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new GetObjectCommand({
        Bucket: file.storage_bucket,
        Key: file.storage_key,
      });

      const response = await s3Client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
        imageBuffer = Buffer.concat(chunks);
      } else {
        throw new Error('Failed to download image from S3');
      }
    } else {
      throw new Error('Storage not configured');
    }

    // Generate thumbnail
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailKey = `${file.storage_key.replace(/\.[^/.]+$/, '')}_thumb.jpg`;

    // Upload thumbnail
    if (supabaseClient) {
      const { error } = await supabaseClient.storage
        .from(file.storage_bucket)
        .upload(thumbnailKey, thumbnailBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload thumbnail: ${error.message}`);
      }
    } else if (s3Client) {
      const command = new PutObjectCommand({
        Bucket: file.storage_bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      });

      await s3Client.send(command);
    }

    // Generate public URL for thumbnail (or use presigned URL)
    let thumbnailUrl: string;

    if (supabaseClient) {
      const { data } = await supabaseClient.storage
        .from(file.storage_bucket)
        .getPublicUrl(thumbnailKey);
      thumbnailUrl = data.publicUrl;
    } else if (s3Client) {
      // For S3, you'd generate a presigned URL or use CloudFront
      thumbnailUrl = `https://${file.storage_bucket}.s3.${config.awsRegion}.amazonaws.com/${thumbnailKey}`;
    } else {
      thumbnailUrl = '';
    }

    // Update file record with thumbnail URL
    await query(
      'UPDATE files SET thumbnail_url = $1 WHERE id = $2',
      [thumbnailUrl, fileId]
    );

    return { success: true, thumbnailUrl };
  },
  {
    connection: {
      host: config.redisUrl.includes('://')
        ? new URL(config.redisUrl).hostname
        : 'localhost',
      port: config.redisUrl.includes('://')
        ? parseInt(new URL(config.redisUrl).port) || 6379
        : 6379,
    },
  }
);

thumbnailWorker.on('completed', (job) => {
  console.log(`Thumbnail job ${job.id} completed`);
});

thumbnailWorker.on('failed', (job, err) => {
  console.error(`Thumbnail job ${job?.id} failed:`, err);
});
