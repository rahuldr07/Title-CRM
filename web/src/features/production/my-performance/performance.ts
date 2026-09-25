import type { QcEntry } from '@/data/quality'

export function scoreSpread(log: QcEntry[]): { lo: number; hi: number } | null {
  const perPerson = Object.values(
    log.reduce<Record<string, number[]>>((acc, x) => {
      ;(acc[x.onName] ??= []).push(x.avg)
      return acc
    }, {}),
  ).map((l) => l.reduce((a, b) => a + b, 0) / l.length)
  return perPerson.length ? { lo: Math.min(...perPerson), hi: Math.max(...perPerson) } : null
}
