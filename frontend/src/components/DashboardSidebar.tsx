'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Folder,
  Star,
  Trash2,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'My Drive', icon: Home },
  { href: '/dashboard/folders', label: 'Folders', icon: Folder },
  { href: '/dashboard/starred', label: 'Starred', icon: Star },
  { href: '/dashboard/trash', label: 'Trash', icon: Trash2 },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-20 h-screen bg-gradient-to-b from-purple-600 to-indigo-700 flex flex-col items-center py-6 fixed left-0 top-0">
      {/* Logo/Icon */}
      <div className="mb-8">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Home className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center justify-center w-12 h-12 rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-white/30 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="space-y-4">
        <button
          className="flex items-center justify-center w-12 h-12 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          className="flex items-center justify-center w-12 h-12 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
