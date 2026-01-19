'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { HardDrive, Calendar, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface StorageOverviewCardProps {
  used: number
  total: number
  filesCount: number
  currentMonth: string
}

export function StorageOverviewCard({
  used,
  total,
  filesCount,
  currentMonth,
}: StorageOverviewCardProps) {
  const [isMonthOpen, setIsMonthOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const percentage = Math.round((used / total) * 100)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMonthOpen(false)
      }
    }

    if (isMonthOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMonthOpen])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <Card className="bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-xl font-semibold">Storage Overview</CardTitle>
              <p className="text-white/70 text-sm mt-0.5">Total storage usage</p>
            </div>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsMonthOpen(!isMonthOpen)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">{currentMonth}</span>
              <ChevronDown className={`w-4 h-4 text-white transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMonthOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
                {months.map((month) => (
                  <button
                    key={month}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMonthOpen(false)}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 text-sm font-medium">Used Storage</span>
              <span className="text-white text-lg font-bold">{formatBytes(used)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-white/70 text-xs">{formatBytes(total)} total</span>
              <span className="text-white/90 text-sm font-semibold">{percentage}% used</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-white/70 text-xs mb-1">Total Files</p>
              <p className="text-white text-2xl font-bold">{filesCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/70 text-xs mb-1">Available</p>
              <p className="text-white text-2xl font-bold">{formatBytes(total - used)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
