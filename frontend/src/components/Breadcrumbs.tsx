'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { Folder } from '@/lib/files'

interface BreadcrumbsProps {
  folders: Folder[]
  currentFolderId: string | null
}

export function Breadcrumbs({ folders, currentFolderId }: BreadcrumbsProps) {
  const buildPath = (folderId: string | null) => {
    if (!folderId) return '/drive'
    
    const path: string[] = []
    let currentId: string | null = folderId
    
    while (currentId) {
      const folder = folders.find((f) => f.id === currentId)
      if (!folder) break
      path.unshift(folder.id)
      currentId = folder.parent_id
    }
    
    return `/drive/folder/${path.join('/')}`
  }

  const getBreadcrumbPath = (folderId: string | null) => {
    if (!folderId) return '/drive'
    return `/drive/folder/${folderId}`
  }

  const breadcrumbs: Array<{ id: string | null; name: string }> = [
    { id: null, name: 'My Drive' },
  ]

  if (currentFolderId) {
    let currentId: string | null = currentFolderId
    const path: Array<{ id: string; name: string }> = []

    while (currentId) {
      const folder = folders.find((f) => f.id === currentId)
      if (!folder) break
      path.unshift({ id: folder.id, name: folder.name })
      currentId = folder.parent_id
    }

    breadcrumbs.push(...path)
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id || 'root'} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
          <Link
            href={getBreadcrumbPath(crumb.id)}
            className={`hover:text-gray-900 ${
              index === breadcrumbs.length - 1 ? 'font-semibold text-gray-900' : ''
            }`}
          >
            {crumb.id === null ? (
              <span className="flex items-center">
                <Home className="w-4 h-4 mr-1" />
                {crumb.name}
              </span>
            ) : (
              crumb.name
            )}
          </Link>
        </div>
      ))}
    </nav>
  )
}
