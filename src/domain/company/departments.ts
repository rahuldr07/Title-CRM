import { companyStore } from './companyStore'
import { nextId } from '@/shared/lib/ids'
import { staffRefusal, type Actor } from '@/domain/auth/permissions'
import { useStoreSlice } from '@/shared/lib/store'
import { currentNaming, stageName, withStageName } from './naming'
import type { Dept } from '@/data/types'

export const useDepartments = (): Dept[] => useStoreSlice(companyStore, (c) => c.depts)
export const currentDepts = (): Dept[] => companyStore.get().depts

export function moveDept(actor: Actor, id: string, dir: -1 | 1): string | null {
  const refused = staffRefusal(actor)
  if (refused) return refused
  const depts = [...currentDepts()]
  const i = depts.findIndex((d) => d.id === id)
  const a = depts[i]
  const b = depts[i + dir]
  if (!a || !b) return null
  depts[i] = b
  depts[i + dir] = a
  companyStore.update((prev) => ({ ...prev, depts }))
  return null
}

function freeKey(name: string): string {
  const taken = new Set([...currentDepts().map((d) => d.n), ...currentNaming().flatMap((r) => (r.stage ? [r.stage] : []))])
  let key = name
  for (let n = 2; taken.has(key); n++) key = `${name} ${n}`
  return key
}

export function saveDept(actor: Actor, next: Omit<Dept, 'id'>, id?: string): string | null {
  const refused = staffRefusal(actor)
  if (refused) return refused
  const name = next.n.trim()
  if (!name) return 'A department needs a name.'
  const clash = currentDepts().find((d) => d.id !== id && stageName(d.n).trim().toLowerCase() === name.toLowerCase())
  if (clash) return `There is already a department called ${stageName(clash.n)}.`
  const was = id ? currentDepts().find((d) => d.id === id) : undefined
  if (id && !was) return 'That department is no longer here.'
  const key = was?.n ?? freeKey(name)
  if (next.pair === key) return 'A department cannot check itself.'
  companyStore.update((prev) => ({
    ...prev,
    depts: was
      ? prev.depts.map((d) => (d.id === id ? { ...d, ...next, n: key } : d))
      : [...prev.depts, { ...next, n: key, id: nextId('d', prev.depts.map((d) => d.id)) }],
    naming: stageName(key, prev.naming) === name ? prev.naming : withStageName(prev.naming, key, name),
  }))
  return null
}

export function removeDept(actor: Actor, id: string): string | null {
  const refused = staffRefusal(actor)
  if (refused) return refused
  const d = currentDepts().find((x) => x.id === id)
  if (!d) return null
  companyStore.update((prev) => ({
    ...prev,
    depts: prev.depts.filter((x) => x.id !== id).map((x) => (x.pair === d.n ? { ...x, pair: null } : x)),
    staff: prev.staff.map((s) => ({ ...s, dep: s.dep.filter((x) => x !== d.n) })),
  }))
  return null
}
