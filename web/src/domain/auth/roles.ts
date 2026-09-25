import { companyStore, keyOf } from '@/domain/company/companyStore'
import { nextId } from '@/shared/lib/ids'
import { grantRefusal, rewordRefusal, staffRefusal, type Actor, type Saved } from './permissions'
import { useStoreSlice } from '@/shared/lib/store'
import type { Perm, Role } from '@/data/types'

export const useRoles = (): Role[] => useStoreSlice(companyStore, (c) => c.roles)
const currentRoles = (): Role[] => companyStore.get().roles
export const usePerms = (): Perm[] => useStoreSlice(companyStore, (c) => c.perms)

export const ADMIN_FLOOR = ['all', 'people', 'config']

export function saveRole(actor: Actor, next: Omit<Role, 'id'>, id?: string): Saved {
  const was = id ? currentRoles().find((r) => r.id === id) : undefined
  const permissions =
    id === 'admin' ? [...new Set([...next.p, ...ADMIN_FLOOR])] : [...next.p]
  const refused = staffRefusal(actor) ?? grantRefusal(actor, was?.p ?? [], permissions)
  if (refused) return { id: null, refused }
  const role = { ...next, p: permissions, lock: was?.lock }
  const made = id ?? nextId('r', currentRoles().map((r) => r.id))
  companyStore.update((prev) => ({
    ...prev,
    roles: id
      ? prev.roles.map((r) => (r.id === id ? { ...r, ...role } : r))
      : [...prev.roles, { ...role, id: made }],
  }))
  return { id: made, refused: null }
}

export function removeRole(actor: Actor, id: string): string | null {
  const r = currentRoles().find((x) => x.id === id)
  const refused = staffRefusal(actor) ?? (r ? grantRefusal(actor, r.p, []) : null)
  if (refused) return refused
  if (!r) return null
  if (r.lock) return `${r.n} is one of the two roles every workspace needs, so it cannot be removed.`
  companyStore.update((prev) => ({
    ...prev,
    roles: prev.roles.filter((x) => x.id !== id),
    staff: prev.staff.map((s) => (s.r === id ? { ...s, r: 'staff' } : s)),
  }))
  return null
}

export function savePerm(actor: Actor, wording: string, k?: string): string | null {
  const refused = staffRefusal(actor) ?? (k ? rewordRefusal(actor, k) : null)
  if (refused) return refused
  if (k) {
    companyStore.update((prev) => ({ ...prev, perms: prev.perms.map((p) => (p.k === k ? { ...p, n: wording } : p)) }))
  } else {
    let key = keyOf(wording)
    let n = 2
    while (companyStore.get().perms.some((p) => p.k === key)) key = `${keyOf(wording)}${n++}`
    companyStore.update((prev) => ({ ...prev, perms: [...prev.perms, { k: key, n: wording, sys: false }] }))
  }
  return null
}

export function removePerm(actor: Actor, k: string): string | null {
  const refused = staffRefusal(actor)
  if (refused) return refused
  const p = companyStore.get().perms.find((x) => x.k === k)
  if (!p || p.sys) return null
  companyStore.update((prev) => ({
    ...prev,
    perms: prev.perms.filter((x) => x.k !== k),
    roles: prev.roles.map((r) => ({ ...r, p: r.p.filter((x) => x !== k) })),
  }))
  return null
}
