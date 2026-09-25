import { ONTIMETARGET } from '@/data/budget'
import { ASSIGN_STAGES } from '@/data/org'
import type { Delivery } from '@/data/deliveries'
import { now } from '@/shared/lib/clock'

export { ONTIMETARGET }
export type { Delivery }

export interface OnTime {
  pct: number | null
  total: number
  late: number
  rows: Delivery[]
}

export function onTime30(deliveries: Delivery[]): OnTime {
  const cut = now().getTime() - 30 * 86400000
  const rows = deliveries.filter((d) => d.d.getTime() >= cut)
  if (!rows.length) return { pct: null, total: 0, late: 0, rows: [] }
  const late = rows.filter((d) => d.late)
  return {
    pct: ((rows.length - late.length) / rows.length) * 100,
    total: rows.length,
    late: late.length,
    rows: late,
  }
}

export function whereTheTimeWent(late: Delivery[]): [stage: string, count: number][] {
  const by: Record<string, number> = {}
  for (const d of late) {
    let worst: string | null = null
    let most = 0
    for (const s of ASSIGN_STAGES) {
      const h = d.st[s] ?? 0
      if (h > most) {
        most = h
        worst = s
      }
    }
    if (worst) by[worst] = (by[worst] ?? 0) + 1
  }
  return Object.entries(by).sort((a, b) => b[1] - a[1])
}

export const CAPACITY_AMBER = 75
export const CAPACITY_RED = 90

export interface CapacityTone {
  fill: string
  text: 'gr' | 'warn' | 'bad'
}

export function capacityTone(pct: number): CapacityTone {
  if (pct > CAPACITY_RED) return { fill: 'var(--bad)', text: 'bad' }
  if (pct > CAPACITY_AMBER) return { fill: 'var(--warn)', text: 'warn' }
  return { fill: 'var(--ok)', text: 'gr' }
}
