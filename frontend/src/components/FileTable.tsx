'use client'

import { DriveFile, Folder } from '@/lib/files'
import { format } from 'date-fns'
import { Download, Trash2, Folder as FolderIcon, File as FileIcon, Eye } from 'lucide-react'

interface FileTableProps {
  files: DriveFile[]
  folders: Folder[]
  onFolderClick: (folderId: string) => void
  onFilePreview: (file: DriveFile) => void
  onFileDownload: (file: DriveFile) => void
  onDelete: (item: { id: string; type: 'file' | 'folder' }) => void
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

function fileTypeLabel(mime: string | null) {
  if (!mime) return 'Unknown'
  if (mime.startsWith('image/')) return 'Image'
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('video/')) return 'Video'
  if (mime.startsWith('audio/')) return 'Audio'
  if (mime.includes('word')) return 'Word'
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'Spreadsheet'
  return mime
}

export function FileTable({ files, folders, onFolderClick, onFilePreview, onFileDownload, onDelete }: FileTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Size</th>
              <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3">Uploaded</th>
              <th className="text-right text-xs font-semibold text-gray-600 px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {folders.map((folder) => (
              <tr key={folder.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    className="flex items-center text-sm font-medium text-gray-900 hover:underline"
                    onClick={() => onFolderClick(folder.id)}
                  >
                    <FolderIcon className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="truncate max-w-[360px]">{folder.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">Folder</td>
                <td className="px-4 py-3 text-sm text-gray-600">-</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {folder.created_at ? format(new Date(folder.created_at), 'PP p') : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      onClick={() => onDelete({ id: folder.id, type: 'folder' })}
                      title="Delete folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {files.map((file) => (
              <tr key={file.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    className="flex items-center text-sm font-medium text-gray-900 hover:underline"
                    onClick={() => onFilePreview(file)}
                  >
                    <FileIcon className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="truncate max-w-[360px]">{file.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{fileTypeLabel(file.mime_type)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatSize(file.size)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {file.created_at ? format(new Date(file.created_at), 'PP p') : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="inline-flex items-center px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => onFilePreview(file)}
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="inline-flex items-center px-2 py-1 text-sm text-blue-700 hover:bg-blue-50 rounded"
                      onClick={() => onFileDownload(file)}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      onClick={() => onDelete({ id: file.id, type: 'file' })}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {files.length === 0 && folders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  No files or folders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
