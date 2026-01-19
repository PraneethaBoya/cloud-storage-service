import express from 'express'
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

  app.get('/', (_req, res) => {
    res.json({ name: 'cloud-storage-api-supabase', ok: true })
  })

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api/files', filesRouter)

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err?.message || 'Unexpected error'
    const status = err?.statusCode || 500
    res.status(status).json({ error: { code: 'INTERNAL_ERROR', message } })
  })

  return app
}
