import { config } from './config.js'

import { createApp } from './app.js'

const app = createApp()

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API (Supabase) listening on http://localhost:${config.port}`)
})
