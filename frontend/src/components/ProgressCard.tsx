'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Folder } from 'lucide-react'

interface ProgressCardProps {
  folderName: string
  used: number
  total: number
  percentage: number
}

export function ProgressCard({ folderName, used, total, percentage }: ProgressCardProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Folder className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-gray-900">{folderName}</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatBytes(used)} / {formatBytes(total)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Usage</span>
            <span className="font-semibold text-gray-900">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
