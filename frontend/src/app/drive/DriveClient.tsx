'use client'

import { useState } from 'react'
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sidebar } from '@/components/Sidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { FileGrid } from '@/components/FileGrid'
import { FileTable } from '@/components/FileTable'
import { FilePreviewModal } from '@/components/FilePreviewModal'
import { FileUpload } from '@/components/FileUpload'
import { getFiles, createFolder, deleteItem, getFileDownloadUrl } from '@/lib/files'
import { Folder, DriveFile } from '@/lib/files'
import { useRouter } from 'next/navigation'
import { Plus, Grid, List } from 'lucide-react'

export default function DriveClient({ initialFolderId }: { initialFolderId?: string } = {}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId || null)

  React.useEffect(() => {
    if (initialFolderId) {
      setCurrentFolderId(initialFolderId)
    }
  }, [initialFolderId])

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['files', currentFolderId],
    queryFn: () => getFiles(currentFolderId || undefined),
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createFolder(name, currentFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] })
      setShowNewFolderDialog(false)
      setNewFolderName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ itemId, type }: { itemId: string; type: 'file' | 'folder' }) => deleteItem(itemId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] })
    },
  })

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId)
    router.push(`/drive/folder/${folderId}`)
  }

  const handleFileClick = (file: DriveFile) => {
    setPreviewFile(file)
  }

  const handleFileDownload = (file: DriveFile) => {
    const downloadUrl = getFileDownloadUrl(file.id)
    window.open(downloadUrl, '_blank')
  }

  const handleContextMenu = (e: React.MouseEvent, item: DriveFile | Folder, type: 'file' | 'folder') => {
    e.preventDefault()
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim())
    }
  }

  const files = data?.files || []
  const folders = data?.folders || []

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">My Drive</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowNewFolderDialog(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Folder
              </button>
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <Breadcrumbs folders={folders} currentFolderId={currentFolderId} />
        </div>

        <div className="flex-1 overflow-auto p-6">
          <FileUpload folderId={currentFolderId} />

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <FileGrid
                  files={files}
                  folders={folders}
                  onFolderClick={handleFolderClick}
                  onFileClick={handleFileClick}
                  onContextMenu={handleContextMenu}
                />
              ) : (
                <FileTable
                  files={files}
                  folders={folders}
                  onFolderClick={handleFolderClick}
                  onFilePreview={handleFileClick}
                  onFileDownload={handleFileDownload}
                  onDelete={({ id, type }) => deleteMutation.mutate({ itemId: id, type })}
                />
              )}
            </>
          )}
        </div>
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">New Folder</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder()
                }
              }}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false)
                  setNewFolderName('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
