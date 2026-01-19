import mongoose, { Schema } from 'mongoose';

export interface UserDocument {
  _id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    name: { type: String, default: null },
    avatar_url: { type: String, default: null },
    last_login_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const UserModel = (mongoose.models.User as mongoose.Model<UserDocument>) || mongoose.model<UserDocument>('User', userSchema);
