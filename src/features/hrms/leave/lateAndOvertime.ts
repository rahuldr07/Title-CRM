import type { LateMark } from '@/data/types'

export function lateSummary(late: Pick<LateMark, 'who' | 'waived'>[]) {
  const open = late.filter((x) => !x.waived)
  const people = new Set(open.map((x) => x.who))
  const repeat = [...people].filter((id) => open.filter((x) => x.who === id).length >= 3)
  return { open: open.length, people: people.size, repeat: repeat.length, waived: late.filter((x) => x.waived).length }
}

export function overtimeSummary(overtime: { st: string }[]) {
  return {
    claims: overtime.filter((o) => o.st !== 'rejected').length,
    pending: overtime.filter((o) => o.st === 'pending').length,
    approved: overtime.filter((o) => o.st === 'approved').length,
  }
}
