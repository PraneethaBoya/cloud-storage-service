import mongoose, { Schema } from 'mongoose';

export interface FolderDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  parent_id: string | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  is_deleted: boolean;
}

const folderSchema = new Schema<FolderDocument>(
  {
    name: { type: String, required: true, trim: true },
    parent_id: { type: String, default: null },
    user_id: { type: String, required: true, index: true },
    deleted_at: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

folderSchema.index({ user_id: 1, parent_id: 1, name: 1, is_deleted: 1 }, { unique: true, partialFilterExpression: { is_deleted: false } });

export const FolderModel = (mongoose.models.Folder as mongoose.Model<FolderDocument>) || mongoose.model<FolderDocument>('Folder', folderSchema);
