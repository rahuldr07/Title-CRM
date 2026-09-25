import { useMemo } from 'react'
import { SEEDED_TENANT_ID, companyStore, type Profile } from './companyStore'
import { useStoreSlice } from '@/shared/lib/store'
import type { PayConfig, Tenant } from '@/data/types'
import { applyDateFormat, type DateFormat } from '@/shared/lib/format'
import { refusal, type Actor } from '@/domain/auth/permissions'

const PAY_SETTINGS = 'pricing'
const PROFILE_EDITOR = 'people'
export const WORKFLOW_EDITOR = 'config'

export type { Profile }

export const currentPayCfg = (): PayConfig => companyStore.get().pay
export const usePayCfg = (): PayConfig => useStoreSlice(companyStore, (c) => c.pay)

export function setPayCfg<K extends keyof PayConfig>(actor: Actor, key: K, value: string | boolean): string | null {
  const refused = refusal(actor, PAY_SETTINGS, 'Changing the pay settings')
  if (refused) return refused
  const current = currentPayCfg()[key]
  let next: PayConfig[K]

  if (typeof current === 'boolean') {
    next = Boolean(value) as PayConfig[K]
  } else if (typeof current === 'number') {
    const n = parseFloat(String(value))
    if (!Number.isFinite(n) || n < 0) return 'That needs a number of zero or more.'
    next = n as PayConfig[K]
  } else {
    const v = String(value).trim()
    if (!v) return 'That cannot be left blank.'
    next = v as PayConfig[K]
  }

  companyStore.update((prev) => ({ ...prev, pay: { ...prev.pay, [key]: next } }))
  return null
}

export const useProfile = (): Profile => useStoreSlice(companyStore, (c) => c.profile)

export function setProfile(actor: Actor, key: 'name' | 'state' | 'tz', value: string): string | null {
  const refused = refusal(actor, PROFILE_EDITOR, 'Changing the company profile')
  if (refused) return refused
  const v = value.trim()
  if (!v) return 'That cannot be left blank.'
  companyStore.update((prev) => ({ ...prev, profile: { ...prev.profile, [key]: v } }))
  return null
}

export { SEEDED_TENANT_ID }

const withProfile = (tenants: readonly Tenant[], profile: Profile): Tenant[] =>
  tenants.map((t) => (t.id === SEEDED_TENANT_ID ? { ...t, name: profile.name, state: profile.state } : t))

export function useWorkspaces(): Tenant[] {
  const tenants = useStoreSlice(companyStore, (c) => c.tenants)
  const profile = useProfile()
  return useMemo(() => withProfile(tenants, profile), [tenants, profile])
}

companyStore.subscribe(() => applyDateFormat(companyStore.get().profile.dateFormat))

export function setDateFormat(actor: Actor, f: DateFormat): string | null {
  const refused = refusal(actor, PROFILE_EDITOR, 'Changing the date format')
  if (refused) return refused
  companyStore.update((prev) => ({ ...prev, profile: { ...prev.profile, dateFormat: f } }))
  return null
}
