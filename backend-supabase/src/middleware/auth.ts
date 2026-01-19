import type { NextFunction, Request, Response } from 'express'
import { supabaseAdmin } from '../supabase.js'

export type AuthenticatedRequest = Request & { userId?: string; userEmail?: string }

export async function authenticateSupabase(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization') || ''
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : ''

    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing Bearer token' } })
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !data.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
    }

    req.userId = data.user.id
    req.userEmail = data.user.email || undefined

    next()
  } catch (err) {
    next(err)
  }
}
