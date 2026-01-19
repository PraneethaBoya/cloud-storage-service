import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../utils/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { User } from '../types/index.js';
import { UserModel } from '../models/User.js';

export async function createUser(email: string, password: string, name?: string): Promise<User> {
  // Ensure password is a valid string
  if (typeof password !== 'string' || password.trim() === '') {
    throw new AppError('INVALID_PASSWORD', 'Password must be a non-empty string', 400);
  }

  // Check if user already exists
  const existingUser = await UserModel.findOne({ email: email.toLowerCase() }).lean();

  if (existingUser) {
    throw new AppError('USER_EXISTS', 'User with this email already exists', 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await UserModel.create({
    email: email.toLowerCase(),
    password_hash: passwordHash,
    name: name || null,
  });

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login_at: user.last_login_at,
  };
}

export async function authenticateUser(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const userDoc = await UserModel.findOne({ email: email.toLowerCase() }).lean<any>();

  if (!userDoc) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const isValid = await comparePassword(password, userDoc.password_hash);

  if (!isValid) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Update last login
  await UserModel.updateOne({ _id: userDoc._id }, { $set: { last_login_at: new Date() } });

  const payload = { userId: userDoc._id.toString(), email: userDoc.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const user: User = {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    avatar_url: userDoc.avatar_url,
    created_at: userDoc.created_at,
    updated_at: userDoc.updated_at,
    last_login_at: userDoc.last_login_at,
  };

  return {
    user,
    accessToken,
    refreshToken,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const userDoc = await UserModel.findById(userId).lean<any>();
  if (!userDoc) return null;

  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    avatar_url: userDoc.avatar_url,
    created_at: userDoc.created_at,
    updated_at: userDoc.updated_at,
    last_login_at: userDoc.last_login_at,
  };
}

export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { verifyRefreshToken, generateAccessToken, generateRefreshToken } = await import('../utils/auth.js');
  
  const payload = verifyRefreshToken(refreshToken);
  
  // Verify user still exists
  const user = await getUserById(payload.userId);
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  const newPayload = { userId: user.id, email: user.email };
  return {
    accessToken: generateAccessToken(newPayload),
    refreshToken: generateRefreshToken(newPayload),
  };
}
