import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { JWTPayload } from '../types/index.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload as any, config.jwtSecret as any, {
    expiresIn: config.jwtExpiresIn as any,
  } as any);
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload as any, config.jwtRefreshSecret as any, {
    expiresIn: config.jwtRefreshExpiresIn as any,
  } as any);
}

export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
