import { NAVPERM } from '@/data/org'
import { companyStore } from '@/domain/company/companyStore'
import type { Person, Role } from '@/data/types'
import { NAV, type NavGroup } from '@/shared/lib/navMenu'
import { createStore, useStore } from '@/shared/lib/store'

export type Actor = Pick<Person, 'id' | 'r'>

export type Saved = { id: string; refused: null } | { id: null; refused: string }

const NO_ROLE: Role = { id: '', n: '—', desc: '', p: [] }

export const roleOf = (roleId: string): Role => {
  const roles = companyStore.get().roles
  return roles.find((r) => r.id === roleId) ?? roles[0] ?? NO_ROLE
}

export const roleName = (roleId: string) => roleOf(roleId).n

const authority = createStore<{ id: string; caps: readonly string[] } | null>(null)

export function setServerAuthority(id: string | null, caps: readonly string[] | null): void {
  const next = id && caps ? { id, caps } : null
  const was = authority.get()
  if (was?.id === next?.id && was?.caps.join() === next?.caps.join()) return
  authority.set(next)
}

export const useAuthority = () => useStore(authority)

export const resetAuthority = authority.reset

type Holder = Pick<Person, 'r'> & { id?: string }

const serverFor = (person: Holder) => {
  const a = authority.get()
  return a && person.id === a.id ? a : null
}

export const authorityFor = (person: Holder): 'server' | 'seed' => (serverFor(person) ? 'server' : 'seed')

export function can(person: Holder | undefined, capability: string): boolean {
  if (!person) return false
  const server = serverFor(person)
  return server ? server.caps.includes(capability) : roleOf(person.r).p.includes(capability)
}

export function refusal(actor: Actor, capability: string, doing: string): string | null {
  if (can(actor, capability)) return null
  const lacking = serverFor(actor) ? 'the server has not given it to your account' : `the ${roleName(actor.r)} role does not have it`
  return `${doing} needs the “${capability}” capability, and ${lacking}. A company admin can make the change, or give your role that capability.`
}

export const STAFF_CAPABILITY = 'people'

const permOf = (k: string) => companyStore.get().perms.find((p) => p.k === k)

export const mayGrant = (actor: Pick<Person, 'r'>, k: string): boolean =>
  !permOf(k)?.never && (can(actor, k) || permOf(k)?.sys === false)

const changedBetween = (was: readonly string[], next: readonly string[]): string[] => [
  ...was.filter((k) => !next.includes(k)),
  ...next.filter((k) => !was.includes(k)),
]

export function grantRefusal(actor: Actor, was: readonly string[], next: readonly string[]): string | null {
  const k = [...changedBetween(was, next), ...was, ...next].find((x) => !mayGrant(actor, x))
  if (k === undefined) return null
  if (permOf(k)?.never) return `“${k}” is not available to any role, by design.`
  return `Granting or taking away “${k}” needs you to hold it yourself, and the ${roleName(actor.r)} role does not. A company admin can make this change.`
}

export function rewordRefusal(actor: Actor, k: string): string | null {
  if (mayGrant(actor, k)) return null
  if (permOf(k)?.never) return `“${k}” is not available to any role, so its wording stays as built.`
  return `Rewording “${k}” needs you to hold it yourself, and the ${roleName(actor.r)} role does not. A company admin can make this change.`
}

export const staffRefusal = (actor: Actor): string | null =>
  refusal(actor, STAFF_CAPABILITY, 'Changing staff records, roles or departments')

export function visibleNav(person: Person | undefined): NavGroup[] {
  const has = (k: string) => can(person, k)
  return NAV.map((g) => ({
    ...g,
    t: g.t.filter((item) => {
      const route = item[1]
      if (route === 'mywork') return !has('all')
      if (route === 'myperf') return (person?.dep.length ?? 0) > 0
      if (route === 'mypay') return !has('pricing')
      if (route === 'dash') return has('all')
      const need = NAVPERM[route]
      return !need || has(need)
    }),
  })).filter((g) => g.t.length > 0)
}

export const routeNeeds = (route: string): string | null => NAVPERM[route] ?? null

export function mayVisit(person: Person | undefined, route: string): boolean {
  if (route === 'dash') return can(person, 'all')
  const need = routeNeeds(route)
  return !need || can(person, need)
}

export const decidesOwn = (parties: readonly string[], deciderId: string): boolean =>
  parties.includes(deciderId)

export const OWN_REQUEST = 'That request is yours, so someone else has to decide it.'
