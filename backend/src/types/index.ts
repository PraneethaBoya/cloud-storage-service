export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  is_deleted: boolean;
}

export interface File {
  id: string;
  name: string;
  folder_id: string | null;
  user_id: string;
  storage_key: string;
  storage_bucket: string;
  mime_type: string | null;
  size: number;
  status: 'uploading' | 'ready' | 'processing' | 'error';
  thumbnail_url: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  is_deleted: boolean;
}

export interface Share {
  id: string;
  file_id: string | null;
  folder_id: string | null;
  owner_id: string;
  shared_with_id: string;
  permission: 'viewer' | 'editor';
  created_at: Date;
  updated_at: Date;
}

export interface LinkShare {
  id: string;
  file_id: string | null;
  folder_id: string | null;
  owner_id: string;
  token: string;
  password_hash: string | null;
  expires_at: Date | null;
  max_access_count: number | null;
  access_count: number;
  permission: 'viewer' | 'editor';
  created_at: Date;
  updated_at: Date;
}

export interface Star {
  id: string;
  user_id: string;
  file_id: string | null;
  folder_id: string | null;
  created_at: Date;
}

export interface Activity {
  id: string;
  user_id: string;
  file_id: string | null;
  folder_id: string | null;
  action: string;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export type Permission = 'viewer' | 'editor';
