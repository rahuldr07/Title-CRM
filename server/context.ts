import { createMiddleware } from 'hono/factory'
import { and, eq } from 'drizzle-orm'
import { auth } from './auth'
import { withTenant } from './db/client'
import { people, rolePermissions, roles } from './db/schema'

export type SessionCtx = {
  Variables: {
    userId: string
    activeTenantId: string | null
  }
}

export type Ctx = {
  Variables: SessionCtx['Variables'] & {
    tenantId: string
    personId: string
    capabilities: Set<string>
  }
}

export const requireSession = createMiddleware<SessionCtx>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Not signed in' }, 401)

  c.set('userId', session.user.id)
  c.set('activeTenantId', session.session.activeTenantId ?? null)
  return next()
})

export const requireWorkspace = createMiddleware<Ctx>(async (c, next) => {
  const userId = c.get('userId')
  const tenantId = c.req.header('x-tenant-id') ?? c.get('activeTenantId')
  if (!tenantId) return c.json({ error: 'No workspace selected' }, 400)

  const found = await withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ personId: people.id, capability: rolePermissions.capability })
      .from(people)
      .innerJoin(roles, eq(roles.id, people.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(and(eq(people.userId, userId), eq(people.active, true)))
    return rows
  })

  const [first] = found
  if (!first) return c.json({ error: 'No access to this workspace' }, 403)

  c.set('tenantId', tenantId)
  c.set('personId', first.personId)
  c.set('capabilities', new Set(found.map((r) => r.capability)))
  return next()
})

export const needs = (capability: string) =>
  createMiddleware<Ctx>(async (c, next) => {
    if (!c.get('capabilities').has(capability)) {
      return c.json({ error: `Needs the "${capability}" capability` }, 403)
    }
    return next()
  })
