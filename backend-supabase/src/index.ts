import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import filesRouter from './routes/files.js'

import { createApp } from './app.js'

const app = createApp()

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API (Supabase) listening on http://localhost:${config.port}`)
})
