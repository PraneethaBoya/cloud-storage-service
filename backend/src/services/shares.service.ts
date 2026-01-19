import { query } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { Share, LinkShare } from '../types/index.js';
import { checkFileAccess, checkFolderAccess } from './files.service.js';
import { generateSecureToken, hashPassword } from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Share a file or folder with a user
 */
export async function shareWithUser(
  ownerId: string,
  itemId: string,
  sharedWithEmail: string,
  permission: 'viewer' | 'editor',
  type: 'file' | 'folder'
): Promise<Share> {
  // Check owner has access
  if (type === 'file') {
    const hasAccess = await checkFileAccess(ownerId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to share this file', 403);
    }
  } else {
    const hasAccess = await checkFolderAccess(ownerId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to share this folder', 403);
    }
  }

  // Get shared_with user
  const userResult = await query('SELECT id FROM users WHERE email = $1', [sharedWithEmail.toLowerCase()]);
  if (userResult.rows.length === 0) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  const sharedWithId = userResult.rows[0].id;

  if (sharedWithId === ownerId) {
    throw new AppError('INVALID_SHARE', 'Cannot share with yourself', 400);
  }

  // Check if share already exists
  const existingResult = await query(
    type === 'file'
      ? 'SELECT id FROM shares WHERE file_id = $1 AND shared_with_id = $2'
      : 'SELECT id FROM shares WHERE folder_id = $1 AND shared_with_id = $2',
    [itemId, sharedWithId]
  );

  if (existingResult.rows.length > 0) {
    // Update existing share
    const result = await query(
      type === 'file'
        ? 'UPDATE shares SET permission = $1 WHERE file_id = $2 AND shared_with_id = $3 RETURNING *'
        : 'UPDATE shares SET permission = $1 WHERE folder_id = $2 AND shared_with_id = $3 RETURNING *',
      [permission, itemId, sharedWithId]
    );

    return result.rows[0];
  }

  // Create new share
  const result = await query(
    type === 'file'
      ? `INSERT INTO shares (file_id, owner_id, shared_with_id, permission)
         VALUES ($1, $2, $3, $4)
         RETURNING *`
      : `INSERT INTO shares (folder_id, owner_id, shared_with_id, permission)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
    [itemId, ownerId, sharedWithId, permission]
  );

  // Log activity
  await query(
    `INSERT INTO activities (user_id, ${type === 'file' ? 'file_id' : 'folder_id'}, action, metadata)
     VALUES ($1, $2, 'share', $3)`,
    [ownerId, itemId, JSON.stringify({ sharedWithEmail, permission })]
  );

  return result.rows[0];
}

/**
 * Revoke a share
 */
export async function revokeShare(
  ownerId: string,
  shareId: string
): Promise<void> {
  const shareResult = await query(
    'SELECT owner_id FROM shares WHERE id = $1',
    [shareId]
  );

  if (shareResult.rows.length === 0) {
    throw new AppError('SHARE_NOT_FOUND', 'Share not found', 404);
  }

  if (shareResult.rows[0].owner_id !== ownerId) {
    throw new AppError('FORBIDDEN', 'You do not have permission to revoke this share', 403);
  }

  await query('DELETE FROM shares WHERE id = $1', [shareId]);
}

/**
 * Create a public share link
 */
export async function createPublicLink(
  ownerId: string,
  itemId: string,
  permission: 'viewer' | 'editor',
  type: 'file' | 'folder',
  password?: string,
  expiresAt?: Date,
  maxAccessCount?: number
): Promise<LinkShare> {
  // Check owner has access
  if (type === 'file') {
    const hasAccess = await checkFileAccess(ownerId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to share this file', 403);
    }
  } else {
    const hasAccess = await checkFolderAccess(ownerId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have permission to share this folder', 403);
    }
  }

  const token = generateSecureToken(32);
  const passwordHash = password ? await hashPassword(password) : null;

  const result = await query(
    type === 'file'
      ? `INSERT INTO link_shares (file_id, owner_id, token, password_hash, expires_at, max_access_count, permission)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`
      : `INSERT INTO link_shares (folder_id, owner_id, token, password_hash, expires_at, max_access_count, permission)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
    [itemId, ownerId, token, passwordHash, expiresAt || null, maxAccessCount || null, permission]
  );

  // Log activity
  await query(
    `INSERT INTO activities (user_id, ${type === 'file' ? 'file_id' : 'folder_id'}, action, metadata)
     VALUES ($1, $2, 'create_link_share', $3)`,
    [ownerId, itemId, JSON.stringify({ hasPassword: !!password, expiresAt, maxAccessCount })]
  );

  return result.rows[0];
}

/**
 * Get public link share by token
 */
export async function getPublicLinkShare(
  token: string,
  password?: string
): Promise<{ share: LinkShare; fileId?: string; folderId?: string }> {
  const result = await query(
    'SELECT * FROM link_shares WHERE token = $1',
    [token]
  );

  if (result.rows.length === 0) {
    throw new AppError('LINK_NOT_FOUND', 'Share link not found', 404);
  }

  const share = result.rows[0] as LinkShare;

  // Check expiry
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    throw new AppError('LINK_EXPIRED', 'Share link has expired', 410);
  }

  // Check access count
  if (share.max_access_count && share.access_count >= share.max_access_count) {
    throw new AppError('LINK_LIMIT_REACHED', 'Share link access limit reached', 410);
  }

  // Verify password if required
  if (share.password_hash) {
    if (!password) {
      throw new AppError('PASSWORD_REQUIRED', 'Password required for this share link', 401);
    }

    const { comparePassword } = await import('../utils/auth.js');
    const isValid = await comparePassword(password, share.password_hash);
    if (!isValid) {
      throw new AppError('INVALID_PASSWORD', 'Invalid password', 401);
    }
  }

  // Increment access count
  await query(
    'UPDATE link_shares SET access_count = access_count + 1 WHERE id = $1',
    [share.id]
  );

  return {
    share,
    fileId: share.file_id || undefined,
    folderId: share.folder_id || undefined,
  };
}

/**
 * Revoke a public link share
 */
export async function revokePublicLink(
  ownerId: string,
  linkId: string
): Promise<void> {
  const linkResult = await query(
    'SELECT owner_id FROM link_shares WHERE id = $1',
    [linkId]
  );

  if (linkResult.rows.length === 0) {
    throw new AppError('LINK_NOT_FOUND', 'Share link not found', 404);
  }

  if (linkResult.rows[0].owner_id !== ownerId) {
    throw new AppError('FORBIDDEN', 'You do not have permission to revoke this link', 403);
  }

  await query('DELETE FROM link_shares WHERE id = $1', [linkId]);
}

/**
 * Get shares for a file or folder
 */
export async function getShares(
  ownerId: string,
  itemId: string,
  type: 'file' | 'folder'
): Promise<{ shares: Share[]; linkShares: LinkShare[] }> {
  // Verify ownership
  if (type === 'file') {
    const hasAccess = await checkFileAccess(ownerId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have access to this file', 403);
    }
  } else {
    const hasAccess = await checkFolderAccess(ownerId, itemId, 'editor');
    if (!hasAccess) {
      throw new AppError('FORBIDDEN', 'You do not have access to this folder', 403);
    }
  }

  const sharesResult = await query(
    type === 'file'
      ? `SELECT s.*, u.email as shared_with_email, u.name as shared_with_name
         FROM shares s
         JOIN users u ON s.shared_with_id = u.id
         WHERE s.file_id = $1`
      : `SELECT s.*, u.email as shared_with_email, u.name as shared_with_name
         FROM shares s
         JOIN users u ON s.shared_with_id = u.id
         WHERE s.folder_id = $1`,
    [itemId]
  );

  const linkSharesResult = await query(
    type === 'file'
      ? 'SELECT * FROM link_shares WHERE file_id = $1'
      : 'SELECT * FROM link_shares WHERE folder_id = $1',
    [itemId]
  );

  return {
    shares: sharesResult.rows,
    linkShares: linkSharesResult.rows,
  };
}
