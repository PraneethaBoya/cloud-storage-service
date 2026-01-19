import path from 'path';
import fs from 'fs/promises';
import { AppError } from '../middleware/errorHandler.js';
import { FileModel } from '../models/File.js';
import { FolderModel } from '../models/Folder.js';

export interface UploadedFileShape {
  originalname: string;
  path: string;
  mimetype: string;
  size: number;
}

export async function listFilesAndFolders(userId: string, folderId: string | null) {
  const [files, folders] = await Promise.all([
    FileModel.find({ user_id: userId, folder_id: folderId, is_deleted: false }).sort({ created_at: -1 }).lean(),
    FolderModel.find({ user_id: userId, parent_id: folderId, is_deleted: false }).sort({ name: 1 }).lean(),
  ]);

  return {
    files: files.map((f: any) => ({
      id: f._id.toString(),
      name: f.name,
      folder_id: f.folder_id,
      user_id: f.user_id,
      storage_key: f.storage_key,
      storage_bucket: f.storage_bucket,
      mime_type: f.mime_type,
      size: f.size,
      status: f.status,
      thumbnail_url: f.thumbnail_url,
      created_at: f.created_at,
      updated_at: f.updated_at,
      deleted_at: f.deleted_at,
      is_deleted: f.is_deleted,
    })),
    folders: folders.map((fo: any) => ({
      id: fo._id.toString(),
      name: fo.name,
      parent_id: fo.parent_id,
      user_id: fo.user_id,
      created_at: fo.created_at,
      updated_at: fo.updated_at,
      deleted_at: fo.deleted_at,
      is_deleted: fo.is_deleted,
    })),
  };
}

export async function createFolder(userId: string, name: string, parentId: string | null) {
  const existing = await FolderModel.findOne({
    user_id: userId,
    parent_id: parentId,
    name,
    is_deleted: false,
  });

  if (existing) {
    throw new AppError('DUPLICATE_FOLDER', 'A folder with this name already exists', 409);
  }

  const folder = await FolderModel.create({
    user_id: userId,
    parent_id: parentId,
    name,
  });

  return {
    id: folder._id.toString(),
    name: folder.name,
    parent_id: folder.parent_id,
    user_id: folder.user_id,
    created_at: folder.created_at,
    updated_at: folder.updated_at,
    deleted_at: folder.deleted_at,
    is_deleted: folder.is_deleted,
  };
}

export async function saveUploadedFile(userId: string, folderId: string | null, file: UploadedFileShape) {
  const doc = await FileModel.create({
    user_id: userId,
    folder_id: folderId,
    name: file.originalname,
    storage_key: file.path,
    storage_bucket: 'local',
    mime_type: file.mimetype,
    size: file.size,
    status: 'ready',
    thumbnail_url: null,
  });

  return {
    id: doc._id.toString(),
    name: doc.name,
    folder_id: doc.folder_id,
    user_id: doc.user_id,
    storage_key: doc.storage_key,
    storage_bucket: doc.storage_bucket,
    mime_type: doc.mime_type,
    size: doc.size,
    status: doc.status,
    thumbnail_url: doc.thumbnail_url,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    deleted_at: doc.deleted_at,
    is_deleted: doc.is_deleted,
  };
}

export async function getFileRecordOrThrow(userId: string, fileId: string) {
  const file = await FileModel.findOne({ _id: fileId, user_id: userId, is_deleted: false }).lean<any>();
  if (!file) {
    throw new AppError('FILE_NOT_FOUND', 'File not found', 404);
  }

  return file;
}

export function resolveStoragePath(storageKey: string) {
  // multer diskStorage uses absolute paths when destination is absolute
  return path.isAbsolute(storageKey) ? storageKey : path.resolve(process.cwd(), storageKey);
}

export async function deleteFile(userId: string, fileId: string) {
  const file = await getFileRecordOrThrow(userId, fileId);

  await FileModel.updateOne(
    { _id: fileId },
    {
      $set: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    }
  );

  const filePath = resolveStoragePath(file.storage_key);
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore missing file
  }
}

export async function deleteFolder(userId: string, folderId: string) {
  const rootFolder = await FolderModel.findOne({ _id: folderId, user_id: userId, is_deleted: false }).lean();
  if (!rootFolder) {
    throw new AppError('FOLDER_NOT_FOUND', 'Folder not found', 404);
  }

  const folderIds: string[] = [folderId];
  const queue: string[] = [folderId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await FolderModel.find({ parent_id: current, user_id: userId, is_deleted: false }).select('_id').lean();
    for (const child of children) {
      const id = (child as any)._id.toString();
      folderIds.push(id);
      queue.push(id);
    }
  }

  const now = new Date();
  await Promise.all([
    FolderModel.updateMany({ _id: { $in: folderIds }, user_id: userId }, { $set: { is_deleted: true, deleted_at: now } }),
    FileModel.updateMany({ folder_id: { $in: folderIds }, user_id: userId }, { $set: { is_deleted: true, deleted_at: now } }),
  ]);
}
