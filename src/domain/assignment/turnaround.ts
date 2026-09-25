import { companyStore, type Budget, type ClockCfg } from '@/domain/company/companyStore'
import { useStoreSlice } from '@/shared/lib/store'
import { refusal, type Actor } from '@/domain/auth/permissions'
import { WORKFLOW_EDITOR } from '@/domain/company/company'
import type { SlaRule } from '@/data/budget'

export type { Budget, ClockCfg }

export const useSla = (): SlaRule[] => useStoreSlice(companyStore, (c) => c.sla)
export const useBudget = (): Budget => useStoreSlice(companyStore, (c) => c.budget)
export const useClock = (): ClockCfg => useStoreSlice(companyStore, (c) => c.clock)

export const currentSla = (): SlaRule[] => companyStore.get().sla
export const currentBudget = (): Budget => companyStore.get().budget

const slaRefusal = (actor: Actor) => refusal(actor, WORKFLOW_EDITOR, 'Changing turnaround and SLA settings')

export function setSlaHours(actor: Actor, i: number, v: string): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  const h = parseInt(v, 10)
  if (!(h > 0)) return 'A promise needs some hours in it.'
  companyStore.update((prev) => ({ ...prev, sla: prev.sla.map((r, j) => (j === i ? { ...r, h: Math.min(336, h) } : r)) }))
  return null
}

export function addSla(actor: Actor, rule: SlaRule): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  const at = currentSla().findIndex((r) => r.cl.startsWith('—'))
  const sla = [...currentSla()]
  sla.splice(at < 0 ? sla.length : at, 0, rule)
  companyStore.update((prev) => ({ ...prev, sla }))
  return null
}

export function removeSla(actor: Actor, i: number): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  const r = currentSla()[i]
  if (!r || r.cl.startsWith('—')) return 'The default promise stays — every order needs one.'
  companyStore.update((prev) => ({ ...prev, sla: prev.sla.filter((_, j) => j !== i) }))
  return null
}

export function setShare(actor: Actor, pr: string, stage: string, v: string): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  const n = Math.max(0, Math.min(100, parseFloat(v)))
  if (!Number.isFinite(n)) return 'A share is a number from 0 to 100.'
  const b = currentBudget()
  companyStore.update((prev) => ({
    ...prev,
    budget:
      pr === 'base'
        ? { ...b, base: { ...b.base, [stage]: n } }
        : {
            ...b,
            over: b.over.map((o) => (o.pr === pr ? { ...o, shares: { ...o.shares, [stage]: n } } : o)),
          },
  }))
  return null
}

export function setBuffer(actor: Actor, v: string): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  const n = parseFloat(v)
  if (!Number.isFinite(n) || n < 0 || n > 50) return 'The buffer is a number from 0 to 50.'
  companyStore.update((prev) => ({ ...prev, budget: { ...prev.budget, buffer: n } }))
  return null
}

export function addOverride(actor: Actor, pr: string): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  if (currentBudget().over.some((o) => o.pr === pr)) return null
  companyStore.update((prev) => ({
    ...prev,
    budget: { ...prev.budget, over: [...prev.budget.over, { pr, shares: { ...prev.budget.base } }] },
  }))
  return null
}

export function removeOverride(actor: Actor, pr: string): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  companyStore.update((prev) => ({ ...prev, budget: { ...prev.budget, over: prev.budget.over.filter((o) => o.pr !== pr) } }))
  return null
}

export function setSlaClock<K extends keyof Omit<ClockCfg, 'pause'>>(actor: Actor, key: K, value: string): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  companyStore.update((prev) => ({ ...prev, clock: { ...prev.clock, [key]: value } }))
  return null
}

export function setPause(actor: Actor, stage: string, on: boolean): string | null {
  const refused = slaRefusal(actor)
  if (refused) return refused
  companyStore.update((prev) => ({ ...prev, clock: { ...prev.clock, pause: { ...prev.clock.pause, [stage]: on } } }))
  return null
}
