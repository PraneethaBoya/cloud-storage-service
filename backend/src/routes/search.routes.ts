import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { searchItems, getStarredItems, toggleStar, getRecentFiles } from '../services/search.service.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/search?q=query&type=file|folder
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as 'file' | 'folder' | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required',
        },
      });
    }

    const results = await searchItems(req.userId!, query, type, limit);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/search/starred
router.get('/starred', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const results = await getStarredItems(req.userId!);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// POST /api/search/star/:itemId?type=file|folder
router.post('/star/:itemId', authenticate, async (req: AuthRequest, res, next) => {
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

    const result = await toggleStar(req.userId!, req.params.itemId, type);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/search/recent
router.get('/recent', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const files = await getRecentFiles(req.userId!, limit);
    res.json({ files });
  } catch (error) {
    next(error);
  }
});

export default router;
