import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { assertAuthSecretIsSet, auth } from './auth'
import { assertServerRoleIsSafe } from './db/client'
import { requireSession, requireWorkspace, type Ctx } from './context'
import { preflightRoutes, sessionRoutes } from './routes/session'
import { productionRoutes } from './routes/production'
import { referenceRoutes } from './routes/reference'
import { hrmsRoutes } from './routes/hrms'
import { businessRoutes } from './routes/business'
import { configRoutes } from './routes/config'

const app = new Hono<Ctx>()

app.use(
  '*',
  cors({
    origin: process.env.APP_URL ?? 'http://localhost:5173',
    credentials: true,
  }),
)

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/api/health', (c) => c.json({ ok: true }))

app.use('/api/*', requireSession)
app.route('/api', preflightRoutes)
app.use('/api/*', requireWorkspace)

app.route('/api', sessionRoutes)
app.route('/api', productionRoutes)
app.route('/api', referenceRoutes)
app.route('/api', businessRoutes)
app.route('/api/hr', hrmsRoutes)
app.route('/api/config', configRoutes)

const port = Number(process.env.PORT ?? 8787)

export const start = () =>
  Promise.resolve()
    .then(assertAuthSecretIsSet)
    .then(assertServerRoleIsSafe)
    .then(() =>
      serve({ fetch: app.fetch, port }, (info) => {
        console.log(`API listening on http://localhost:${info.port}`)
      }),
    )

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST && !process.env.VERCEL) {
  start().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}

export default app
