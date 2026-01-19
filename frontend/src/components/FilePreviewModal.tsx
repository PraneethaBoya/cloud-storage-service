'use client'

import { DriveFile, getFileDownloadUrl } from '@/lib/files'
import { API_URL } from '@/lib/api'
import { X, Download } from 'lucide-react'
import { useEffect } from 'react'

interface FilePreviewModalProps {
  file: DriveFile | null
  onClose: () => void
}

function isImage(mime: string | null) {
  return !!mime && mime.startsWith('image/')
}

function isPdf(mime: string | null) {
  return mime === 'application/pdf'
}

function isVideo(mime: string | null) {
  return !!mime && mime.startsWith('video/')
}

function isAudio(mime: string | null) {
  return !!mime && mime.startsWith('audio/')
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!file) return null

  const viewUrl = `${API_URL}/api/files/${file.id}/view`

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500 truncate">{file.mime_type || 'Unknown type'} · {file.size} bytes</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={getFileDownloadUrl(file.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </a>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-gray-50">
          <div className="w-full h-[70vh]">
            {isImage(file.mime_type) && (
              <div className="w-full h-full flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={viewUrl} alt={file.name} className="max-h-full max-w-full rounded" />
              </div>
            )}

            {isPdf(file.mime_type) && (
              <iframe src={viewUrl} className="w-full h-full" />
            )}

            {isVideo(file.mime_type) && (
              <video src={viewUrl} controls className="w-full h-full" />
            )}

            {isAudio(file.mime_type) && (
              <div className="w-full h-full flex items-center justify-center p-6">
                <audio src={viewUrl} controls className="w-full" />
              </div>
            )}

            {!isImage(file.mime_type) && !isPdf(file.mime_type) && !isVideo(file.mime_type) && !isAudio(file.mime_type) && (
              <div className="w-full h-full flex items-center justify-center p-6 text-center">
                <div>
                  <p className="text-sm text-gray-700">Preview not available for this file type.</p>
                  <p className="text-xs text-gray-500 mt-1">Use Download to open it locally.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <button className="absolute inset-0" aria-label="Close overlay" onClick={onClose} />
    </div>
  )
}
