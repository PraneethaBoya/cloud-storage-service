import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth.js';
import { UserModel } from '../models/User.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  file?: any;
  files?: any;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const payload = verifyAccessToken(token);
    
    // Verify user still exists
    const userDoc = await UserModel.findById(payload.userId).lean<any>();

    if (!userDoc) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
      });
    }

    req.userId = payload.userId;
    req.user = {
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name,
      avatar_url: userDoc.avatar_url,
    };
    next();
  } catch (error: any) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Invalid token',
      },
    });
  }
}
