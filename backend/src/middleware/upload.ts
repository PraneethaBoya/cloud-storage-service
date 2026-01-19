import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/index.js';
import type { Request } from 'express';

type UploadedFile = {
  originalname: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function createUploadMiddleware(getUserId: (req: any) => string) {
  const storage = multer.diskStorage({
    destination: async (req: Request, _file: UploadedFile, cb: (error: Error | null, destination: string) => void) => {
      try {
        const userId = getUserId(req);
        const rootDir = path.resolve(process.cwd(), config.uploadDir);
        const userDir = path.join(rootDir, userId);
        await ensureDir(userDir);
        cb(null, userDir);
      } catch (err) {
        cb(err as Error, '');
      }
    },
    filename: (_req: Request, file: UploadedFile, cb: (error: Error | null, filename: string) => void) => {
      const safeName = sanitizeFileName(file.originalname);
      const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniquePrefix}-${safeName}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: config.maxFileSize,
    },
  });
}
