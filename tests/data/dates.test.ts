import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { INVOICES } from '@/data/business'
import { LEAVE } from '@/data/hrms'
import { ORDERS } from '@/data/production'
import { loadDeliveries } from '@/data/deliveries'
import { monthBounds, inRange } from '@/domain/invoices/invoices'
import { fmtDate } from '@/shared/lib/format'

const DATA = 'src/data'

describe('the seed is written in wall-clock time', () => {
  it('has no date built from a UTC instant string', () => {
    const offenders: string[] = []
    for (const f of readdirSync(DATA).filter((n) => n.endsWith('.ts'))) {
      const text = readFileSync(`${DATA}/${f}`, 'utf8')
      text.split('\n').forEach((line, i) => {
        if (/new Date\('[\d-]+T[\d:.]+Z'\)/.test(line)) offenders.push(`${DATA}/${f}:${i + 1}`)
      })
    }
    expect(offenders, 'these dates move by a day depending on the reader’s zone').toEqual([])
  })
})

describe('every date means the same day to every reader', () => {
  it('keeps each invoice inside the month it is labelled with', () => {
    for (const i of INVOICES) {
      const [from, to] = monthBounds(i.m)
      expect(inRange(i, { from, to }), `${i.id} is labelled ${i.m} but issued ${fmtDate(i.issued)}`).toBe(true)
    }
  })

  it('starts every leave request at midnight, so a day is a whole day', () => {
    for (const l of LEAVE) {
      expect([l.from.getHours(), l.from.getMinutes()], `${l.id} starts mid-day`).toEqual([0, 0])
      expect([l.to.getHours(), l.to.getMinutes()], `${l.id} ends mid-day`).toEqual([0, 0])
      expect(l.to.getTime(), `${l.id} ends before it starts`).toBeGreaterThanOrEqual(l.from.getTime())
    }
  })

  it('never has an order due before it was received', () => {
    for (const o of ORDERS) {
      expect(o.due.getTime(), `${o.id} is due before it arrived`).toBeGreaterThan(o.recv.getTime())
    }
  })

  it('gives every delivery the day the export’s own display key states', async () => {
    const raw = JSON.parse(readFileSync(`${DATA}/deliveries.json`, 'utf8')) as { id: string; dk: string }[]
    const key = new Map(raw.map((r) => [r.id, r.dk]))
    for (const x of await loadDeliveries()) {
      expect(fmtDate(x.d), `${x.id} renders on a different day than its display key`).toBe(key.get(x.id))
    }
  })

  it('leaves the export’s display key behind, so a screen can only print the date in the company’s format', async () => {
    expect((await loadDeliveries()).filter((x) => 'dk' in x)).toEqual([])
  })

  it('revives every delivery at the wall clock the wire value was written in', async () => {
    const raw = JSON.parse(readFileSync(`${DATA}/deliveries.json`, 'utf8')) as { id: string; d: string }[]
    const wire = new Map(raw.map((r) => [r.id, r.d]))
    for (const x of await loadDeliveries()) {
      const ist = new Date(new Date(wire.get(x.id)!).getTime() + 5.5 * 3600_000)
      expect(
        [x.d.getFullYear(), x.d.getMonth(), x.d.getDate(), x.d.getHours(), x.d.getMinutes()],
        `${x.id} was revived as an instant rather than as the design's wall clock`,
      ).toEqual([
        ist.getUTCFullYear(),
        ist.getUTCMonth(),
        ist.getUTCDate(),
        ist.getUTCHours(),
        ist.getUTCMinutes(),
      ])
    }
  })
})
