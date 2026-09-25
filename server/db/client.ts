import { assertRlsApplies, createDb, withTenantOn, type Db } from './connect'

const MISSING_URL =
  'APP_DATABASE_URL is not set. The server connects as the non-owner application ' +
  'role so that row-level security applies to it — see server/db/rls.sql. ' +
  'Copy .env.example to .env and fill it in.'

let connection: ReturnType<typeof createDb> | null = null

function connect() {
  if (connection) return connection
  const url = process.env.APP_DATABASE_URL
  if (!url) throw new Error(MISSING_URL)
  connection = createDb(url)
  return connection
}

export const isConfigured = () => Boolean(process.env.APP_DATABASE_URL)

export const db: Db = new Proxy({} as Db, {
  get: (_t, prop, receiver) => Reflect.get(connect().db, prop, receiver) as unknown,
  has: (_t, prop) => Reflect.has(connect().db, prop),
})

export type { Db }

export const withTenant = <T>(tenantId: string, fn: (tx: Db) => Promise<T>): Promise<T> =>
  withTenantOn(db, tenantId, fn)

export const assertServerRoleIsSafe = () => assertRlsApplies(db)
