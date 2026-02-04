import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import filesRouter from './routes/files.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  )
  app.use(express.json({ limit: '2mb' }))

  app.get('/', (_req: Request, res: Response) => {
    res.json({ name: 'cloud-storage-api-supabase', ok: true })
  })

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true })
  })

  app.use('/api/files', filesRouter)

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (!err) {
      return next()
    }

    const e = err as { message?: string; statusCode?: number }
    const message = e.message || 'Unexpected error'
    const status = e.statusCode || 500
    return res.status(status).json({ error: { code: 'INTERNAL_ERROR', message } })
  })

  return app
}
