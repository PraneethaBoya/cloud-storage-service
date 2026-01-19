import { api } from './api'

export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at?: string
}

export interface AuthResponse {
  user: User
  accessToken?: string
  refreshToken?: string
}

export async function signup(email: string, password: string, name?: string): Promise<AuthResponse> {
  const response = await api.post('/auth/signup', { email, password, name })
  return response.data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post('/auth/login', { email, password })
  const { accessToken, refreshToken, user } = response.data
  
  // Store tokens if provided (for JWT-based auth)
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken)
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken)
  }
  
  return { user, accessToken, refreshToken }
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

export async function getCurrentUser(): Promise<User> {
  try {
    const response = await api.get('/auth/me')
    return response.data.user
  } catch (error: any) {
    // If unauthorized, clear tokens
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
    throw error
  }
}
