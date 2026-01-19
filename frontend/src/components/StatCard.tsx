'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  gradient?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, gradient }: StatCardProps) {
  return (
    <Card className={`overflow-hidden ${gradient || 'bg-gradient-to-br from-purple-500 to-indigo-600'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white/90 text-sm font-medium">{title}</CardTitle>
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        {subtitle && <p className="text-white/70 text-sm">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
