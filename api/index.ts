import { handle } from 'hono/vercel'
import app from '../server/index'
import { assertServerRoleIsSafe, isConfigured } from '../server/db/client'
import { assertAuthSecretIsSet } from '../server/auth'

export const config = {
  runtime: 'nodejs',
}

let roleChecked: Promise<void> | null = null
const checkRole = () =>
  (roleChecked ??= Promise.resolve().then(assertAuthSecretIsSet).then(assertServerRoleIsSafe))

const handler = handle(app)

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url)
  if (pathname === '/api/health') return handler(req)

  if (!isConfigured()) {
    return Response.json(
      { error: 'APP_DATABASE_URL is not set on this deployment.' },
      { status: 503 },
    )
  }

  try {
    await checkRole()
  } catch (e) {
    roleChecked = null
    const message = e instanceof Error ? e.message : 'Database role check failed'
    return Response.json({ error: message }, { status: 503 })
  }
  return handler(req)
}
