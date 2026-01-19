'use client'

import { useQuery } from '@tanstack/react-query'
import { getCurrentUser, User } from '@/lib/auth'

export function useCurrentUser(options?: { enabled?: boolean }) {
  return useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: options?.enabled !== false, // Default to true, can be disabled
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false
      }
      return failureCount < 1
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}
