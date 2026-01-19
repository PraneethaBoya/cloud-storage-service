import mongoose, { Schema } from 'mongoose';

export type FileStatus = 'uploading' | 'ready' | 'processing' | 'error';

export interface FileDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  folder_id: string | null;
  user_id: string;
  storage_key: string;
  storage_bucket: string;
  mime_type: string | null;
  size: number;
  status: FileStatus;
  thumbnail_url: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  is_deleted: boolean;
}

const fileSchema = new Schema<FileDocument>(
  {
    name: { type: String, required: true, trim: true },
    folder_id: { type: String, default: null, index: true },
    user_id: { type: String, required: true, index: true },
    storage_key: { type: String, required: true },
    storage_bucket: { type: String, required: true, default: 'local' },
    mime_type: { type: String, default: null },
    size: { type: Number, required: true },
    status: { type: String, required: true, default: 'ready' },
    thumbnail_url: { type: String, default: null },
    deleted_at: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

fileSchema.index({ user_id: 1, folder_id: 1, created_at: -1 });

export const FileModel = (mongoose.models.File as mongoose.Model<FileDocument>) || mongoose.model<FileDocument>('File', fileSchema);
