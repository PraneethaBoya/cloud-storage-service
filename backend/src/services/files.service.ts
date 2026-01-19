import { query, transaction } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { File, Folder } from '../types/index.js';
import { generatePresignedUploadUrls, generatePresignedDownloadUrl, deleteFile } from './storage.service.js';
import { config } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Check if user has access to a file
 */
export async function checkFileAccess(userId: string, fileId: string, permission: 'viewer' | 'editor' = 'viewer'): Promise<boolean> {
  // Check if user owns the file
  const fileResult = await query(
    'SELECT user_id FROM files WHERE id = $1 AND is_deleted = FALSE',
    [fileId]
  );

  if (fileResult.rows.length === 0) {
    return false;
  }

  if (fileResult.rows[0].user_id === userId) {
    return true;
  }

  // Check if file is shared with user
  const shareResult = await query(
    `SELECT permission FROM shares 
     WHERE file_id = $1 AND shared_with_id = $2`,
    [fileId, userId]
  );

  if (shareResult.rows.length > 0) {
    const sharePermission = shareResult.rows[0].permission;
    if (permission === 'viewer') {
      return true;
    }
    return sharePermission === 'editor';
  }

  // Check parent folder access
  const folderResult = await query(
    'SELECT folder_id FROM files WHERE id = $1',
    [fileId]
  );

  if (folderResult.rows.length > 0 && folderResult.rows[0].folder_id) {
    return checkFolderAccess(userId, folderResult.rows[0].folder_id, permission);
  }

  return false;
}

/**
 * Check if user has access to a folder
 */
export async function checkFolderAccess(userId: string, folderId: string, permission: 'viewer' | 'editor' = 'viewer'): Promise<boolean> {
  // Check if user owns the folder
  const folderResult = await query(
    'SELECT user_id FROM folders WHERE id = $1 AND is_deleted = FALSE',
    [folderId]
  );

  if (folderResult.rows.length === 0) {
    return false;
  }

  if (folderResult.rows[0].user_id === userId) {
    return true;
  }

  // Check if folder is shared with user
  const shareResult = await query(
    `SELECT permission FROM shares 
     WHERE folder_id = $1 AND shared_with_id = $2`,
    [folderId, userId]
  );

  if (shareResult.rows.length > 0) {
    const sharePermission = shareResult.rows[0].permission;
    if (permission === 'viewer') {
      return true;
    }
    return sharePermission === 'editor';
  }

  // Check parent folder access
  const parentResult = await query(
    'SELECT parent_id FROM folders WHERE id = $1',
    [folderId]
  );

  if (parentResult.rows.length > 0 && parentResult.rows[0].parent_id) {
    return checkFolderAccess(userId, parentResult.rows[0].parent_id, permission);
  }

  return false;
}

/**
 * Initialize file upload - creates DB record and returns presigned URLs
 */
export async function initFileUpload(
  userId: string,
  fileName: string,
  folderId: string | null,
  mimeType: string,
  fileSize: number,
  partCount: number = 1
) {
  // Validate folder access if folderId is provided
  if (folderId) {
    const hasAccess = await checkFolderAccess(userId, folderId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to upload to this folder', 403);
    }
  }

  // Check file size
  if (fileSize > config.maxFileSize) {
    throw new AppError('FILE_TOO_LARGE', `File size exceeds maximum of ${config.maxFileSize} bytes`, 400);
  }

  const fileId = uuidv4();
  const storageKey = `${userId}/${fileId}/${fileName}`;
  const bucket = config.supabaseStorageBucket || config.awsS3Bucket;

  // Generate presigned URLs
  const uploadUrls = await generatePresignedUploadUrls(storageKey, mimeType, fileSize, partCount);

  // Create file record in database
  await query(
    `INSERT INTO files (id, name, folder_id, user_id, storage_key, storage_bucket, mime_type, size, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploading')`,
    [fileId, fileName, folderId, userId, storageKey, bucket, mimeType, fileSize]
  );

  // Log activity
  await query(
    `INSERT INTO activities (user_id, file_id, action, metadata)
     VALUES ($1, $2, 'upload', $3)`,
    [userId, fileId, JSON.stringify({ fileName, fileSize })]
  );

  return {
    fileId,
    uploadUrls,
  };
}

/**
 * Complete file upload - verifies upload and marks file as ready
 */
export async function completeFileUpload(
  userId: string,
  fileId: string,
  parts?: Array<{ partNumber: number; etag: string }>
) {
  // Verify file ownership
  const fileResult = await query(
    'SELECT * FROM files WHERE id = $1 AND user_id = $2',
    [fileId, userId]
  );

  if (fileResult.rows.length === 0) {
    throw new AppError('FILE_NOT_FOUND', 'File not found', 404);
  }

  const file = fileResult.rows[0];

  if (file.status !== 'uploading') {
    throw new AppError('INVALID_STATUS', 'File is not in uploading status', 400);
  }

  // Update file status to ready
  await query(
    'UPDATE files SET status = $1 WHERE id = $2',
    ['ready', fileId]
  );

  // Enqueue thumbnail generation job (if image)
  if (file.mime_type?.startsWith('image/')) {
    const { thumbnailQueue } = await import('../jobs/thumbnail.job.js');
    await thumbnailQueue.add('generate-thumbnail', { fileId });
  }

  return { success: true };
}

/**
 * Get files in a folder
 */
export async function getFiles(
  userId: string,
  folderId: string | null,
  includeShared: boolean = true
): Promise<File[]> {
  let queryText = `
    SELECT f.* FROM files f
    WHERE f.is_deleted = FALSE
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (folderId === null) {
    queryText += ` AND f.folder_id IS NULL`;
  } else {
    // Check folder access
    const hasAccess = await checkFolderAccess(userId, folderId);
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have access to this folder', 403);
    }
    queryText += ` AND f.folder_id = $${paramIndex}`;
    params.push(folderId);
    paramIndex++;
  }

  if (includeShared) {
    queryText += `
      AND (
        f.user_id = $${paramIndex}
        OR EXISTS (
          SELECT 1 FROM shares s WHERE s.file_id = f.id AND s.shared_with_id = $${paramIndex}
        )
      )
    `;
    params.push(userId);
  } else {
    queryText += ` AND f.user_id = $${paramIndex}`;
    params.push(userId);
  }

  queryText += ` ORDER BY f.created_at DESC`;

  const result = await query(queryText, params);
  return result.rows;
}

/**
 * Get folders in a parent folder
 */
export async function getFolders(
  userId: string,
  parentId: string | null,
  includeShared: boolean = true
): Promise<Folder[]> {
  let queryText = `
    SELECT fo.* FROM folders fo
    WHERE fo.is_deleted = FALSE
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (parentId === null) {
    queryText += ` AND fo.parent_id IS NULL`;
  } else {
    // Check parent folder access
    const hasAccess = await checkFolderAccess(userId, parentId);
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have access to this folder', 403);
    }
    queryText += ` AND fo.parent_id = $${paramIndex}`;
    params.push(parentId);
    paramIndex++;
  }

  if (includeShared) {
    queryText += `
      AND (
        fo.user_id = $${paramIndex}
        OR EXISTS (
          SELECT 1 FROM shares s WHERE s.folder_id = fo.id AND s.shared_with_id = $${paramIndex}
        )
      )
    `;
    params.push(userId);
  } else {
    queryText += ` AND fo.user_id = $${paramIndex}`;
    params.push(userId);
  }

  queryText += ` ORDER BY fo.name ASC`;

  const result = await query(queryText, params);
  return result.rows;
}

/**
 * Create a folder
 */
export async function createFolder(
  userId: string,
  name: string,
  parentId: string | null
): Promise<Folder> {
  // Validate parent folder access
  if (parentId) {
    const hasAccess = await checkFolderAccess(userId, parentId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to create folders here', 403);
    }
  }

  // Check for duplicate name
  const existingResult = await query(
    'SELECT id FROM folders WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND name = $3 AND is_deleted = FALSE',
    [userId, parentId, name]
  );

  if (existingResult.rows.length > 0) {
    throw new AppError('DUPLICATE_FOLDER', 'A folder with this name already exists', 409);
  }

  const result = await query(
    `INSERT INTO folders (name, parent_id, user_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, parentId, userId]
  );

  // Log activity
  await query(
    `INSERT INTO activities (user_id, folder_id, action, metadata)
     VALUES ($1, $2, 'create_folder', $3)`,
    [userId, result.rows[0].id, JSON.stringify({ name })]
  );

  return result.rows[0];
}

/**
 * Rename a file or folder
 */
export async function renameItem(
  userId: string,
  itemId: string,
  newName: string,
  type: 'file' | 'folder'
): Promise<File | Folder> {
  if (type === 'file') {
    const hasAccess = await checkFileAccess(userId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to rename this file', 403);
    }

    const result = await query(
      'UPDATE files SET name = $1 WHERE id = $2 RETURNING *',
      [newName, itemId]
    );

    if (result.rows.length === 0) {
      throw new AppError('FILE_NOT_FOUND', 'File not found', 404);
    }

    // Log activity
    await query(
      `INSERT INTO activities (user_id, file_id, action, metadata)
       VALUES ($1, $2, 'rename', $3)`,
      [userId, itemId, JSON.stringify({ newName })]
    );

    return result.rows[0];
  } else {
    const hasAccess = await checkFolderAccess(userId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to rename this folder', 403);
    }

    // Check for duplicate name
    const folderResult = await query('SELECT parent_id FROM folders WHERE id = $1', [itemId]);
    if (folderResult.rows.length === 0) {
      throw new AppError('FOLDER_NOT_FOUND', 'Folder not found', 404);
    }

    const parentId = folderResult.rows[0].parent_id;
    const existingResult = await query(
      'SELECT id FROM folders WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND name = $3 AND id != $4 AND is_deleted = FALSE',
      [userId, parentId, newName, itemId]
    );

    if (existingResult.rows.length > 0) {
      throw new AppError('DUPLICATE_FOLDER', 'A folder with this name already exists', 409);
    }

    const result = await query(
      'UPDATE folders SET name = $1 WHERE id = $2 RETURNING *',
      [newName, itemId]
    );

    // Log activity
    await query(
      `INSERT INTO activities (user_id, folder_id, action, metadata)
       VALUES ($1, $2, 'rename', $3)`,
      [userId, itemId, JSON.stringify({ newName })]
    );

    return result.rows[0];
  }
}

/**
 * Move a file or folder
 */
export async function moveItem(
  userId: string,
  itemId: string,
  newFolderId: string | null,
  type: 'file' | 'folder'
): Promise<File | Folder> {
  if (type === 'file') {
    const hasAccess = await checkFileAccess(userId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to move this file', 403);
    }

    if (newFolderId) {
      const folderAccess = await checkFolderAccess(userId, newFolderId, 'editor');
      if (!folderAccess) {
        throw new AppError('FORBIDDEN', 'You do not have permission to move files to this folder', 403);
      }
    }

    const fileResult = await query('SELECT name FROM files WHERE id = $1', [itemId]);
    if (fileResult.rows.length === 0) {
      throw new AppError('FILE_NOT_FOUND', 'File not found', 404);
    }

    // Check for duplicate name in destination
    const duplicateResult = await query(
      'SELECT id FROM files WHERE folder_id IS NOT DISTINCT FROM $1 AND name = $2 AND id != $3 AND is_deleted = FALSE',
      [newFolderId, fileResult.rows[0].name, itemId]
    );

    if (duplicateResult.rows.length > 0) {
      throw new AppError('DUPLICATE_FILE', 'A file with this name already exists in the destination', 409);
    }

    const result = await query(
      'UPDATE files SET folder_id = $1 WHERE id = $2 RETURNING *',
      [newFolderId, itemId]
    );

    // Log activity
    await query(
      `INSERT INTO activities (user_id, file_id, action, metadata)
       VALUES ($1, $2, 'move', $3)`,
      [userId, itemId, JSON.stringify({ newFolderId })]
    );

    return result.rows[0];
  } else {
    const hasAccess = await checkFolderAccess(userId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to move this folder', 403);
    }

    if (newFolderId) {
      const folderAccess = await checkFolderAccess(userId, newFolderId, 'editor');
      if (!folderAccess) {
        throw new AppError('FORBIDDEN', 'You do not have permission to move folders to this location', 403);
      }

      // Prevent moving folder into itself or its children
      const checkResult = await query(
        'SELECT id FROM folders WHERE id = $1 AND (id = $2 OR parent_id = $2)',
        [newFolderId, itemId]
      );

      if (checkResult.rows.length > 0) {
        throw new AppError('INVALID_MOVE', 'Cannot move folder into itself or its children', 400);
      }
    }

    const folderResult = await query('SELECT name FROM folders WHERE id = $1', [itemId]);
    if (folderResult.rows.length === 0) {
      throw new AppError('FOLDER_NOT_FOUND', 'Folder not found', 404);
    }

    // Check for duplicate name in destination
    const duplicateResult = await query(
      'SELECT id FROM folders WHERE parent_id IS NOT DISTINCT FROM $1 AND name = $2 AND id != $3 AND is_deleted = FALSE',
      [newFolderId, folderResult.rows[0].name, itemId]
    );

    if (duplicateResult.rows.length > 0) {
      throw new AppError('DUPLICATE_FOLDER', 'A folder with this name already exists in the destination', 409);
    }

    const result = await query(
      'UPDATE folders SET parent_id = $1 WHERE id = $2 RETURNING *',
      [newFolderId, itemId]
    );

    // Log activity
    await query(
      `INSERT INTO activities (user_id, folder_id, action, metadata)
       VALUES ($1, $2, 'move', $3)`,
      [userId, itemId, JSON.stringify({ newFolderId })]
    );

    return result.rows[0];
  }
}

/**
 * Soft delete a file or folder
 */
export async function deleteItem(
  userId: string,
  itemId: string,
  type: 'file' | 'folder'
): Promise<void> {
  if (type === 'file') {
    const hasAccess = await checkFileAccess(userId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to delete this file', 403);
    }

    await query(
      'UPDATE files SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1',
      [itemId]
    );

    // Log activity
    await query(
      `INSERT INTO activities (user_id, file_id, action)
       VALUES ($1, $2, 'delete')`,
      [userId, itemId]
    );
  } else {
    const hasAccess = await checkFolderAccess(userId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to delete this folder', 403);
    }

    await query(
      'UPDATE folders SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1',
      [itemId]
    );

    // Also soft delete all files in the folder
    await query(
      'UPDATE files SET is_deleted = TRUE, deleted_at = NOW() WHERE folder_id = $1',
      [itemId]
    );

    // Log activity
    await query(
      `INSERT INTO activities (user_id, folder_id, action)
       VALUES ($1, $2, 'delete')`,
      [userId, itemId]
    );
  }
}

/**
 * Get download URL for a file
 */
export async function getFileDownloadUrl(
  userId: string,
  fileId: string,
  expiresIn: number = 3600
): Promise<string> {
  const hasAccess = await checkFileAccess(userId, fileId);
  if (!hasAccess) {
    throw new AppError('FORBIDDEN', 'You do not have access to this file', 403);
  }

  const result = await query(
    'SELECT storage_key, storage_bucket FROM files WHERE id = $1',
    [fileId]
  );

  if (result.rows.length === 0) {
    throw new AppError('FILE_NOT_FOUND', 'File not found', 404);
  }

  const { storage_key, storage_bucket } = result.rows[0];
  const downloadUrl = await generatePresignedDownloadUrl(storage_key, storage_bucket, expiresIn);

  // Log activity
  await query(
    `INSERT INTO activities (user_id, file_id, action)
     VALUES ($1, $2, 'download')`,
    [userId, fileId]
  );

  return downloadUrl;
}
