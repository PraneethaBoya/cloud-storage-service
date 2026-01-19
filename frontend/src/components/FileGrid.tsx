'use client'

import { DriveFile, Folder } from '@/lib/files'
import { Folder as FolderIcon, File as FileIcon, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface FileGridProps {
  files: DriveFile[]
  folders: Folder[]
  onFolderClick: (folderId: string) => void
  onFileClick: (file: DriveFile) => void
  onContextMenu?: (e: React.MouseEvent, item: DriveFile | Folder, type: 'file' | 'folder') => void
}

export function FileGrid({ files, folders, onFolderClick, onFileClick, onContextMenu }: FileGridProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="group relative p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onFolderClick(folder.id)}
          onContextMenu={(e) => onContextMenu?.(e, folder, 'folder')}
        >
          <div className="flex flex-col items-center">
            <FolderIcon className="w-12 h-12 text-blue-500 mb-2" />
            <p className="text-sm font-medium text-center truncate w-full">{folder.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}

      {files.map((file) => (
        <div
          key={file.id}
          className="group relative p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onFileClick(file)}
          onContextMenu={(e) => onContextMenu?.(e, file, 'file')}
        >
          <div className="flex flex-col items-center">
            <FileIcon className="w-12 h-12 text-gray-500 mb-2" />
            <p className="text-sm font-medium text-center truncate w-full">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{formatSize(file.size)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}

      {files.length === 0 && folders.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          No files or folders
        </div>
      )}
    </div>
  )
}
