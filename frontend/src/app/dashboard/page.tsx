'use client'

import { DashboardSidebar } from '@/components/DashboardSidebar'
import { SearchInput } from '@/components/SearchInput'
import { StorageOverviewCard } from '@/components/StorageOverviewCard'
import { StatCard } from '@/components/StatCard'
import { FeatureCard } from '@/components/FeatureCard'
import { ProgressCard } from '@/components/ProgressCard'
import { ActivityCard } from '@/components/ActivityCard'
import { Upload, Share2, Star, HardDrive } from 'lucide-react'
import { useState } from 'react'

// Mock data
const mockStorageData = {
  used: 45.2 * 1024 * 1024 * 1024, // 45.2 GB
  total: 100 * 1024 * 1024 * 1024, // 100 GB
  filesCount: 1247,
  currentMonth: 'April',
}

const mockFolders = [
  { name: 'Documents', used: 12.5 * 1024 * 1024 * 1024, total: 20 * 1024 * 1024 * 1024, percentage: 62.5 },
  { name: 'Images', used: 18.3 * 1024 * 1024 * 1024, total: 30 * 1024 * 1024 * 1024, percentage: 61 },
  { name: 'Videos', used: 10.2 * 1024 * 1024 * 1024, total: 25 * 1024 * 1024 * 1024, percentage: 40.8 },
  { name: 'Music', used: 4.2 * 1024 * 1024 * 1024, total: 25 * 1024 * 1024 * 1024, percentage: 16.8 },
]

const mockActivities = [
  { id: '1', type: 'upload' as const, fileName: 'project-proposal.pdf', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
  { id: '2', type: 'download' as const, fileName: 'presentation.pptx', timestamp: new Date(Date.now() - 1000 * 60 * 45) },
  { id: '3', type: 'share' as const, fileName: 'team-photo.jpg', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '4', type: 'upload' as const, fileName: 'report-2024.xlsx', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  { id: '5', type: 'delete' as const, fileName: 'old-document.doc', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
]

export default function DashboardPage() {
  const [searchValue, setSearchValue] = useState('')

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      
      <div className="ml-20">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back! Here&apos;s your storage overview.</p>
            </div>
            <div className="flex items-center space-x-4">
              <SearchInput onSearch={setSearchValue} />
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow">
                <span className="text-white font-semibold text-sm">JD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          <div className="grid grid-cols-12 gap-6">
            {/* Storage Overview - Large Card */}
            <div className="col-span-12 lg:col-span-8">
              <StorageOverviewCard
                used={mockStorageData.used}
                total={mockStorageData.total}
                filesCount={mockStorageData.filesCount}
                currentMonth={mockStorageData.currentMonth}
              />
            </div>

            {/* Quick Stats */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <StatCard
                title="Total Files"
                value={mockStorageData.filesCount.toLocaleString()}
                subtitle="Across all folders"
                icon={HardDrive}
                gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
              />
              <StatCard
                title="Shared Files"
                value="23"
                subtitle="Active shares"
                icon={Share2}
                gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              />
            </div>

            {/* Feature Cards */}
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                title="Recent Uploads"
                count={12}
                icon={Upload}
                href="/dashboard/uploads"
                gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
              />
              <FeatureCard
                title="Shared with Me"
                count={8}
                icon={Share2}
                href="/dashboard/shared"
                gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
              />
              <FeatureCard
                title="Starred Files"
                count={15}
                icon={Star}
                href="/dashboard/starred"
                gradient="bg-gradient-to-br from-pink-500 to-rose-600"
              />
            </div>

            {/* Folder Progress Cards */}
            <div className="col-span-12 lg:col-span-8">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Folder Usage</h2>
                <p className="text-sm text-gray-500 mt-1">Storage breakdown by folder</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockFolders.map((folder) => (
                  <ProgressCard
                    key={folder.name}
                    folderName={folder.name}
                    used={folder.used}
                    total={folder.total}
                    percentage={folder.percentage}
                  />
                ))}
              </div>
            </div>

            {/* Activity Panel */}
            <div className="col-span-12 lg:col-span-4">
              <ActivityCard activities={mockActivities} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
