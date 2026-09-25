import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SEEDED_TENANT_ID, useWorkspaces } from '@/domain/company/company'
import type { Person, Tenant } from '@/data/types'
import { newPerson } from '@/domain/people/people'
import { authorityFor, can as canFor, roleName, setServerAuthority, useAuthority } from './permissions'
import { endSession as endApiSession, fetchMe, fetchMemberships, type Membership } from '@/shared/lib/api'
import { DEMO_IDENTITY } from '@/shared/lib/demo'
import { useRoles } from '@/domain/auth/roles'
import { useStaff, findPerson } from '@/domain/people/roster'
import {
  endSession as endSeedSession,
  readSession as readSeedSession,
  startSession as startSeedSession,
} from './seedSession'

type AuthState = 'loading' | 'authenticated' | 'anonymous' | 'demo'

interface SessionValue {
  me: Person
  tenant: Tenant
  theme: 'light' | 'dark'
  navOpen: boolean
  authority: 'server' | 'seed'
  authState: AuthState
  memberships: Membership[]
  signInAs: (id: string) => void
  signOut: () => Promise<void>
  switchTenant: (id: string) => void
  toggleTheme: () => void
  setNavOpen: (open: boolean) => void
  can: (capability: string) => boolean
  roleLabel: string
}

const SessionContext = createContext<SessionValue | null>(null)

const isServerTenantId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

const NO_TENANT: Tenant = { id: '', name: '', plan: '', state: '' }

const THEME_KEY = 'titlecrm.theme'

function savedTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY)
  } catch {
    return null
  }
}

function keepTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    return
  }
}

function initialTheme(): 'light' | 'dark' {
  const saved = savedTheme()
  if (saved === 'light' || saved === 'dark') return saved
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [meId, setMeId] = useState<string | null>(() => readSeedSession())
  const [pickedTenantId, setTenantId] = useState(SEEDED_TENANT_ID || NO_TENANT.id)
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme)
  const [navOpen, setNavOpen] = useState(false)
  const queryClient = useQueryClient()

  const memberships = useQuery({
    queryKey: ['memberships'],
    queryFn: () => fetchMemberships(null),
    retry: false,
    staleTime: 5 * 60_000,
  })

  const tenantId = isServerTenantId(pickedTenantId)
    ? pickedTenantId
    : ((memberships.data?.find((t) => t.current) ?? memberships.data?.[0])?.id ?? pickedTenantId)

  const header = isServerTenantId(tenantId) ? tenantId : null

  const me = useQuery({
    queryKey: ['me', header],
    queryFn: () => fetchMe(header),
    retry: false,
    staleTime: 5 * 60_000,
    enabled: header !== null,
  })

  const serverCaps = me.data?.capabilities

  const bootstrapping = memberships.isPending || (header !== null && me.isPending)

  const authState: AuthState = bootstrapping
    ? 'loading'
    : me.isSuccess
      ? 'authenticated'
      : meId
        ? 'demo'
        : 'anonymous'

  const staff = useStaff()
  const person = useMemo<Person>(() => {
    const ref = me.data?.person?.ref
    return (
      findPerson(staff, ref) ??
      findPerson(staff, meId) ??
      staff[0] ??
      newPerson()
    )
  }, [me.data?.person?.ref, meId, staff])

  const workspaces = useWorkspaces()
  const tenant = useMemo<Tenant>(() => {
    const fromServer = memberships.data?.find((t) => t.id === tenantId)
    if (fromServer) {
      return { id: fromServer.id, name: fromServer.name, plan: fromServer.plan, state: fromServer.state }
    }
    if (me.data?.tenant && isServerTenantId(tenantId)) {
      const t = me.data.tenant
      return { id: t.id, name: t.name, plan: t.plan, state: t.state }
    }
    return workspaces.find((t) => t.id === tenantId) ?? workspaces[0] ?? NO_TENANT
  }, [memberships.data, me.data, tenantId, workspaces])

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    document.body.classList.toggle('navopen', navOpen)
  }, [navOpen])

  useEffect(() => {
    setServerAuthority(serverCaps ? person.id : null, serverCaps ?? null)
  }, [serverCaps, person.id])

  const roles = useRoles()
  const held = useAuthority()
  const authority = authorityFor(person)
  const can = useCallback(
    (capability: string) => canFor(person, capability),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `roles` and `held` are read inside canFor
    [person, roles, held],
  )

  const signInAs = useCallback((id: string) => {
    if (!DEMO_IDENTITY) return
    startSeedSession(id)
    setMeId(id)
  }, [])

  const signOut = useCallback(async () => {
    endSeedSession()
    setMeId(null)
    await endApiSession()
    await queryClient.resetQueries()
  }, [queryClient])

  const value = useMemo<SessionValue>(
    () => ({
      me: person,
      tenant,
      theme,
      navOpen,
      authority,
      authState,
      memberships: memberships.data ?? [],
      signInAs,
      signOut,
      switchTenant: setTenantId,
      toggleTheme: () =>
        setTheme((t) => {
          const next = t === 'dark' ? 'light' : 'dark'
          keepTheme(next)
          return next
        }),
      setNavOpen,
      can,
      roleLabel: roleName(person.r),
    }),
    [person, tenant, theme, navOpen, authority, authState, memberships.data, signInAs, signOut, can],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession(): SessionValue {
  const ctx = use(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
