import { query } from '../db/index.js';
import { File, Folder } from '../types/index.js';
import { checkFileAccess, checkFolderAccess } from './files.service.js';

/**
 * Search files and folders
 */
export async function searchItems(
  userId: string,
  query: string,
  type?: 'file' | 'folder',
  limit: number = 50
): Promise<{ files: File[]; folders: Folder[] }> {
  const searchTerm = `%${query}%`;

  let filesQuery = `
    SELECT f.* FROM files f
    WHERE f.is_deleted = FALSE
      AND f.name ILIKE $1
      AND (
        f.user_id = $2
        OR EXISTS (
          SELECT 1 FROM shares s WHERE s.file_id = f.id AND s.shared_with_id = $2
        )
      )
  `;

  let foldersQuery = `
    SELECT fo.* FROM folders fo
    WHERE fo.is_deleted = FALSE
      AND fo.name ILIKE $1
      AND (
        fo.user_id = $2
        OR EXISTS (
          SELECT 1 FROM shares s WHERE s.folder_id = fo.id AND s.shared_with_id = $2
        )
      )
  `;

  const params: any[] = [searchTerm, userId];

  if (type === 'file') {
    const result = await query(`${filesQuery} ORDER BY f.name LIMIT $3`, [...params, limit]);
    return { files: result.rows, folders: [] };
  } else if (type === 'folder') {
    const result = await query(`${foldersQuery} ORDER BY fo.name LIMIT $3`, [...params, limit]);
    return { files: [], folders: result.rows };
  } else {
    const filesResult = await query(`${filesQuery} ORDER BY f.name LIMIT $3`, [...params, limit]);
    const foldersResult = await query(`${foldersQuery} ORDER BY fo.name LIMIT $3`, [...params, limit]);
    return { files: filesResult.rows, folders: foldersResult.rows };
  }
}

/**
 * Get starred files and folders
 */
export async function getStarredItems(
  userId: string
): Promise<{ files: File[]; folders: Folder[] }> {
  const filesResult = await query(
    `SELECT f.* FROM files f
     INNER JOIN stars s ON s.file_id = f.id
     WHERE s.user_id = $1 AND f.is_deleted = FALSE
     ORDER BY s.created_at DESC`,
    [userId]
  );

  const foldersResult = await query(
    `SELECT fo.* FROM folders fo
     INNER JOIN stars s ON s.folder_id = fo.id
     WHERE s.user_id = $1 AND fo.is_deleted = FALSE
     ORDER BY s.created_at DESC`,
    [userId]
  );

  return {
    files: filesResult.rows,
    folders: foldersResult.rows,
  };
}

/**
 * Star/unstar an item
 */
export async function toggleStar(
  userId: string,
  itemId: string,
  type: 'file' | 'folder'
): Promise<{ starred: boolean }> {
  // Check access
  if (type === 'file') {
    const hasAccess = await checkFileAccess(userId, itemId);
    if (!hasAccess) {
      throw new Error('FORBIDDEN');
    }
  } else {
    const hasAccess = await checkFolderAccess(userId, itemId);
    if (!hasAccess) {
      throw new Error('FORBIDDEN');
    }
  }

  // Check if already starred
  const existingResult = await query(
    type === 'file'
      ? 'SELECT id FROM stars WHERE user_id = $1 AND file_id = $2'
      : 'SELECT id FROM stars WHERE user_id = $1 AND folder_id = $2',
    [userId, itemId]
  );

  if (existingResult.rows.length > 0) {
    // Unstar
    await query(
      type === 'file'
        ? 'DELETE FROM stars WHERE user_id = $1 AND file_id = $2'
        : 'DELETE FROM stars WHERE user_id = $1 AND folder_id = $2',
      [userId, itemId]
    );
    return { starred: false };
  } else {
    // Star
    await query(
      type === 'file'
        ? 'INSERT INTO stars (user_id, file_id) VALUES ($1, $2)'
        : 'INSERT INTO stars (user_id, folder_id) VALUES ($1, $2)',
      [userId, itemId]
    );
    return { starred: true };
  }
}

/**
 * Get recent files
 */
export async function getRecentFiles(
  userId: string,
  limit: number = 20
): Promise<File[]> {
  const result = await query(
    `SELECT DISTINCT f.* FROM files f
     INNER JOIN activities a ON a.file_id = f.id
     WHERE a.user_id = $1
       AND f.is_deleted = FALSE
       AND a.action IN ('upload', 'download', 'view')
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}
