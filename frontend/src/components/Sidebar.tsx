'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Folder, Star, Trash2, Share2, Home, Search } from 'lucide-react'
import { logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/drive', label: 'My Drive', icon: Home },
  { href: '/drive/shared', label: 'Shared with me', icon: Share2 },
  { href: '/drive/starred', label: 'Starred', icon: Star },
  { href: '/drive/trash', label: 'Trash', icon: Trash2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-bold">Cloud Storage</h1>
      </div>
      
      <nav className="flex-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
