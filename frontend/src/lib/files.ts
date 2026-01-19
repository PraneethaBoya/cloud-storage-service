import { api, API_URL } from './api'

export interface DriveFile {
  id: string
  name: string
  folder_id: string | null
  user_id: string
  storage_key: string
  storage_bucket: string
  mime_type: string | null
  size: number
  status: 'uploading' | 'ready' | 'processing' | 'error'
  thumbnail_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_deleted: boolean
}

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  user_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_deleted: boolean
}

export interface FilesResponse {
  files: DriveFile[]
  folders: Folder[]
}

export interface UploadInitResponse {
  fileId: string
  uploadUrls: {
    uploadId?: string
    parts: Array<{
      partNumber: number
      uploadUrl: string
    }>
    completeUrl: string
  }
}

export async function getFiles(folderId?: string, includeShared: boolean = true): Promise<FilesResponse> {
  const params = new URLSearchParams()
  if (folderId) params.append('folderId', folderId)
  if (!includeShared) params.append('includeShared', 'false')
  
  const response = await api.get(`/files?${params.toString()}`)
  return response.data
}

export async function initFileUpload(
  fileName: string,
  folderId: string | null,
  mimeType: string,
  fileSize: number,
  partCount: number = 1
): Promise<UploadInitResponse> {
  throw new Error('initFileUpload is not supported in the local Multer backend')
}

export async function completeFileUpload(
  fileId: string,
  parts?: Array<{ partNumber: number; etag: string }>
): Promise<void> {
  throw new Error('completeFileUpload is not supported in the local Multer backend')
}

export async function uploadFile(
  file: globalThis.File,
  folderId: string | null,
  onProgress?: (percent: number) => void
): Promise<DriveFile> {
  const form = new FormData()
  form.append('file', file)
  if (folderId) form.append('folderId', folderId)

  const response = await api.post('/files/upload', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (evt) => {
      if (!evt.total) return
      const percent = Math.round((evt.loaded / evt.total) * 100)
      onProgress?.(percent)
    },
  })

  return response.data.file
}

export async function createFolder(name: string, parentId: string | null): Promise<Folder> {
  const response = await api.post('/files/folders', { name, parentId })
  return response.data
}

export async function renameItem(
  itemId: string,
  newName: string,
  type: 'file' | 'folder'
): Promise<DriveFile | Folder> {
  const response = await api.patch('/files/rename', { itemId, newName, type })
  return response.data
}

export async function moveItem(
  itemId: string,
  newFolderId: string | null,
  type: 'file' | 'folder'
): Promise<DriveFile | Folder> {
  const response = await api.patch('/files/move', { itemId, newFolderId, type })
  return response.data
}

export async function deleteItem(itemId: string, type: 'file' | 'folder'): Promise<void> {
  if (type === 'file') {
    await api.delete(`/files/${itemId}`)
    return
  }
  await api.delete(`/files/folders/${itemId}`)
}

export function getFileDownloadUrl(fileId: string): string {
  return `${API_URL}/api/files/${fileId}/download`
}
