import { QC_CRITERIA, qcAverage, type StageWorkResult } from '@/domain/quality/quality'
import type { Delivery } from '@/data/deliveries'
import type { QcEntry } from '@/data/quality'

export function teamSummary(dels: Delivery[], rows: QcEntry[]) {
  const opportunities = dels.length * 2
  return {
    opportunities,
    cover: opportunities ? Math.round((rows.length / opportunities) * 100) : 0,
    overall: qcAverage(rows),
    defects: rows.filter((x) => x.defect),
    spread: [...new Set(rows.map((x) => Math.round(x.avg)))].length,
  }
}

export const weakDepartments = (tw: StageWorkResult) =>
  Object.entries(tw.dept)
    .filter(([, v]) => v.rate < 70)
    .sort((a, b) => a[1].rate - b[1].rate)

export const criteriaLost = (mine: QcEntry[], below: QcEntry[]) =>
  QC_CRITERIA.map(([name, field]) => ({
    c: name,
    n: below.filter((x) => x.crit === name).length,
    avg: mine.reduce((a, x) => a + x[field], 0) / mine.length,
  })).sort((a, b) => b.n - a.n)

export function ratersOf(mine: QcEntry[]) {
  const raters: Record<string, { n: string; c: number; s: number }> = {}
  mine.forEach((x) => {
    const r = (raters[x.byName] ??= { n: x.byName, c: 0, s: 0 })
    r.c++
    r.s += x.avg
  })
  return Object.values(raters)
    .map((x) => ({ ...x, avg: x.s / x.c }))
    .sort((a, b) => b.c - a.c)
}
