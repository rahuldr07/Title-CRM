import { companyStore } from '@/domain/company/companyStore'
import { nextId } from '@/shared/lib/ids'
import { grantRefusal, roleOf, staffRefusal, type Actor, type Saved } from '@/domain/auth/permissions'
import { staffProblem } from './people'
import { useStoreSlice } from '@/shared/lib/store'
import type { Person } from '@/data/types'

export const useStaff = (): Person[] => useStoreSlice(companyStore, (c) => c.staff)
export const currentStaff = (): Person[] => companyStore.get().staff

export const findPerson = (staff: readonly Person[], id: string | null | undefined): Person | undefined =>
  id ? staff.find((s) => s.id === id) : undefined

export const personById = (id: string | null | undefined): Person | undefined => findPerson(currentStaff(), id)

export const whoName = (id: string | null | undefined): string => personById(id)?.n ?? '—'

function recordProblem(person: Person, id: string | undefined): string | null {
  const staff = currentStaff()
  const rec = findPerson(staff, id)
  const { n, e, bank, pan, uan, aadhaar } = person
  return staffProblem({ name: n.trim(), mail: e.trim().toLowerCase(), acct: bank.acct, ifsc: bank.ifsc, pan, uan, aadhaar }, staff, id, rec)
}

function roleChangeRefusal(actor: Actor, person: Person, id: string | undefined): string | null {
  const was = findPerson(currentStaff(), id)?.r
  if (was === person.r) return null
  return grantRefusal(actor, was ? roleOf(was).p : [], roleOf(person.r).p)
}

export function saveStaff(actor: Actor, person: Person, id?: string): Saved {
  const refused = staffRefusal(actor) ?? roleChangeRefusal(actor, person, id) ?? recordProblem(person, id)
  if (refused) return { id: null, refused }
  const made = id ?? nextId('p', currentStaff().map((s) => s.id))
  companyStore.update((prev) => ({
    ...prev,
    staff: id
      ? prev.staff.map((s) => (s.id === id ? { ...s, ...person, id } : s))
      : [...prev.staff, { ...person, id: made }],
  }))
  return { id: made, refused: null }
}

export function removeStaff(actor: Actor, id: string): string | null {
  const refused = staffRefusal(actor)
  if (refused) return refused
  companyStore.update((prev) => ({ ...prev, staff: prev.staff.filter((s) => s.id !== id) }))
  return null
}
