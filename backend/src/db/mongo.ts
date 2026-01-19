import mongoose from 'mongoose';
import { config } from '../config/index.js';

export async function connectMongo() {
  const uri = config.mongoUri;
  if (!uri) {
    throw new Error('Missing MONGODB_URI');
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(uri);
  console.log('✅ MongoDB connected');
}
