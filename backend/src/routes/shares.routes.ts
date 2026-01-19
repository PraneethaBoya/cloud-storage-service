import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  shareWithUser,
  revokeShare,
  createPublicLink,
  getPublicLinkShare,
  revokePublicLink,
  getShares,
} from '../services/shares.service.js';

const router = Router();

const shareWithUserSchema = z.object({
  itemId: z.string().uuid(),
  sharedWithEmail: z.string().email(),
  permission: z.enum(['viewer', 'editor']),
  type: z.enum(['file', 'folder']),
});

const createPublicLinkSchema = z.object({
  itemId: z.string().uuid(),
  permission: z.enum(['viewer', 'editor']),
  type: z.enum(['file', 'folder']),
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  maxAccessCount: z.number().int().positive().optional(),
});

const getPublicLinkSchema = z.object({
  password: z.string().optional(),
});

// POST /api/shares
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = shareWithUserSchema.parse(req.body);
    const share = await shareWithUser(
      req.userId!,
      body.itemId,
      body.sharedWithEmail,
      body.permission,
      body.type
    );

    res.status(201).json(share);
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

// DELETE /api/shares/:shareId
router.delete('/:shareId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await revokeShare(req.userId!, req.params.shareId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/shares/public
router.post('/public', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = createPublicLinkSchema.parse(req.body);
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    
    const linkShare = await createPublicLink(
      req.userId!,
      body.itemId,
      body.permission,
      body.type,
      body.password,
      expiresAt,
      body.maxAccessCount
    );

    res.status(201).json(linkShare);
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

// GET /api/shares/public/:token
router.get('/public/:token', async (req, res, next) => {
  try {
    const { password } = getPublicLinkSchema.parse(req.query);
    const result = await getPublicLinkShare(req.params.token, password);

    res.json(result);
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

// DELETE /api/shares/public/:linkId
router.delete('/public/:linkId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await revokePublicLink(req.userId!, req.params.linkId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/shares/:itemId?type=file|folder
router.get('/:itemId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const type = req.query.type as 'file' | 'folder';
    if (!type || !['file', 'folder'].includes(type)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Type must be either "file" or "folder"',
        },
      });
    }

    const shares = await getShares(req.userId!, req.params.itemId, type);
    res.json(shares);
  } catch (error) {
    next(error);
  }
});

export default router;
