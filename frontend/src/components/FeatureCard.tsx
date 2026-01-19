'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { LucideIcon, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface FeatureCardProps {
  title: string
  count: number
  icon: LucideIcon
  href: string
  gradient: string
}

export function FeatureCard({ title, count, icon: Icon, href, gradient }: FeatureCardProps) {
  return (
    <Link href={href}>
      <Card className={`overflow-hidden ${gradient} hover:shadow-xl transition-shadow cursor-pointer group`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-white text-lg font-semibold mb-2">{title}</CardTitle>
          <div className="text-2xl font-bold text-white">{count}</div>
        </CardContent>
      </Card>
    </Link>
  )
}
