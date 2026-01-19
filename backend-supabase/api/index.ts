import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createApp } from '../src/app.js'

const app = createApp()

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as any)(req, res)
}
