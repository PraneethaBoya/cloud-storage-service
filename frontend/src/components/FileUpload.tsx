'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X } from 'lucide-react'
import { uploadFile as uploadFileApi } from '@/lib/files'
import { useQueryClient } from '@tanstack/react-query'

interface UploadProgress {
  fileId: string
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
}

interface FileUploadProps {
  folderId: string | null
}

export function FileUpload({ folderId }: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const queryClient = useQueryClient()

  const uploadSingleFile = async (file: File) => {
    const tempId = crypto.randomUUID()
    const uploadProgress: UploadProgress = {
      fileId: tempId,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    }

    setUploads((prev) => [...prev, uploadProgress])

    try {
      const saved = await uploadFileApi(file, folderId, (progress: number) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === tempId ? { ...u, progress } : u
          )
        )
      })

      setUploads((prev) =>
        prev.map((u) =>
          u.fileId === tempId ? { ...u, fileId: saved.id, status: 'completed', progress: 100 } : u
        )
      )

      // Refresh file list
      queryClient.invalidateQueries({ queryKey: ['files', folderId] })

      // Remove completed upload after 3 seconds
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.fileId !== tempId && u.fileId !== saved.id))
      }, 3000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploads((prev) =>
        prev.map((u) =>
          u.fileId === tempId ? { ...u, status: 'error' } : u
        )
      )
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        uploadSingleFile(file)
      })
    },
    [folderId]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  })

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      
      {isDragActive && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <p className="text-xl font-semibold">Drop files to upload</p>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.fileId}
              className="bg-white rounded-lg shadow-lg p-4 min-w-[300px] border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium truncate flex-1">{upload.fileName}</p>
                {upload.status === 'completed' && (
                  <button
                    onClick={() =>
                      setUploads((prev) => prev.filter((u) => u.fileId !== upload.fileId))
                    }
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {upload.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.status === 'completed' && (
                <p className="text-xs text-green-600">Upload completed</p>
              )}
              {upload.status === 'error' && (
                <p className="text-xs text-red-600">Upload failed</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
