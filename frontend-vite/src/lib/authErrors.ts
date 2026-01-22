import type { AuthError } from 'firebase/auth'

export function formatAuthError(err: unknown): string {
  const code = (err as AuthError | undefined)?.code

  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address'
    case 'auth/user-not-found':
      return 'User not found'
    case 'auth/wrong-password':
      return 'Invalid email or password'
    case 'auth/invalid-credential':
      return 'Invalid email or password'
    case 'auth/email-already-in-use':
      return 'Email is already in use'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.'
    default:
      return (err as any)?.message || 'Something went wrong'
  }
}
