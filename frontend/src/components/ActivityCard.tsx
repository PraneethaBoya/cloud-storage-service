'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Download, Upload, Share2, Trash2, File, LucideIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  type: 'upload' | 'download' | 'share' | 'delete'
  fileName: string
  timestamp: Date
}

const activityIcons: Record<Activity['type'], LucideIcon> = {
  upload: Upload,
  download: Download,
  share: Share2,
  delete: Trash2,
}

const activityColors: Record<Activity['type'], string> = {
  upload: 'bg-blue-100 text-blue-600',
  download: 'bg-green-100 text-green-600',
  share: 'bg-purple-100 text-purple-600',
  delete: 'bg-red-100 text-red-600',
}

interface ActivityCardProps {
  activities: Activity[]
}

export function ActivityCard({ activities }: ActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type]
            const colorClass = activityColors[activity.type]

            return (
              <div key={activity.id} className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} •{' '}
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
