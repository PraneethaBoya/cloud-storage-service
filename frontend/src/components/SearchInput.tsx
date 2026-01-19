'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'

interface SearchInputProps {
  placeholder?: string
  onSearch?: (value: string) => void
}

export function SearchInput({ placeholder = 'Search files...', onSearch }: SearchInputProps) {
  const [value, setValue] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onSearch?.(newValue)
  }

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder-gray-400"
      />
    </div>
  )
}
