import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createUploadMiddleware } from '../middleware/upload.js';
import {
  listFilesAndFolders,
  createFolder,
  deleteFile,
  deleteFolder,
  getFileRecordOrThrow,
  resolveStoragePath,
  saveUploadedFile,
} from '../services/files.local.service.js';

const router = Router();

const createFolderSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
});

// GET /api/files?folderId=xxx
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const folderId = req.query.folderId as string | undefined;

    const result = await listFilesAndFolders(req.userId!, folderId || null);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/files/upload (multipart/form-data)
const upload = createUploadMiddleware((req: AuthRequest) => req.userId!);
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    const folderId = (req.body.folderId as string | undefined) || null;
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File is required',
        },
      });
    }

    const saved = await saveUploadedFile(req.userId!, folderId, req.file);
    res.status(201).json({ file: saved });
  } catch (error) {
    next(error);
  }
});

// POST /api/files/folders
router.post('/folders', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = createFolderSchema.parse(req.body);
    const folder = await createFolder(req.userId!, body.name, body.parentId || null);

    res.status(201).json(folder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    }
    next(error);
  }
});

// GET /api/files/:fileId/download
router.get('/:fileId/download', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const file = await getFileRecordOrThrow(req.userId!, req.params.fileId);
    const filePath = resolveStoragePath(file.storage_key);
    res.download(filePath, file.name);
  } catch (error) {
    next(error);
  }
});

// GET /api/files/:fileId/view
router.get('/:fileId/view', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const file = await getFileRecordOrThrow(req.userId!, req.params.fileId);
    const filePath = resolveStoragePath(file.storage_key);
    if (file.mime_type) {
      res.setHeader('Content-Type', file.mime_type);
    }
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/files/folders/:folderId
router.delete('/folders/:folderId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await deleteFolder(req.userId!, req.params.folderId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/files/:fileId
router.delete('/:fileId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await deleteFile(req.userId!, req.params.fileId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
