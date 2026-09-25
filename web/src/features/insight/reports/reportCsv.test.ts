import { describe, expect, it } from 'vitest'
import { qualityCsv, workloadCsv } from './reportCsv'
import { toCSV } from '@/shared/lib/csv'
import type { QcEntry } from '@/data/quality'
import type { WorkRow } from '@/domain/assignment/workload'
import { newPerson } from '@/domain/people/people'

describe('a report cell a spreadsheet would run as a formula', () => {
  it('is neutralised in a staff name, a client name and a QC note alike', () => {
    const entry: QcEntry = {
      d: new Date(2026, 6, 29, 11, 0),
      order: 'ORD-1',
      cl: '=cmd|\' /C calc\'!A0',
      pr: 'COS',
      stage: 'Search',
      on: 'p1',
      onName: '@Uma',
      by: 'p2',
      byName: '+Asha',
      acc: 4,
      comp: 5,
      fmt: 3,
      avg: 4,
      defect: false,
      crit: null,
      note: '=1+2',
    }
    const row = toCSV(qualityCsv([entry]).rows).split('\r\n')[1]?.split(',') ?? []
    expect(row[2]).toBe("'=cmd|' /C calc'!A0")
    expect(row[5]).toBe("'@Uma")
    expect(row[6]).toBe("'+Asha")
    expect(row[11]).toBe("'=1+2")
  })
})

describe('column order', () => {
  const entry: QcEntry = {
    d: new Date(2026, 6, 29, 11, 0),
    order: 'ORD-2291',
    cl: 'MGR',
    pr: 'COS',
    stage: 'Search',
    on: 'p1',
    onName: 'Uma Sankar',
    by: 'p2',
    byName: 'Asha Rao',
    acc: 4,
    comp: 5,
    fmt: 3,
    avg: 4,
    defect: true,
    crit: 'fmt',
    note: 'legal description truncated, and the vesting deed was missed',
  }

  it('writes the quality log exactly as the recipient reads it', () => {
    expect(toCSV(qualityCsv([entry]).rows)).toBe(
      'Date,Order,Client,Product,Stage,Worked by,Rated by,Accuracy,Completeness,Formatting,Defect,Reason\r\n' +
        '07/29/2026,ORD-2291,MGR,COS,Search,Uma Sankar,Asha Rao,4,5,3,yes,' +
        '"legal description truncated, and the vesting deed was missed"',
    )
  })

  it('names the file after the report rather than the screen', () => {
    expect(qualityCsv([]).name).toBe('quality')
    expect(qualityCsv([]).rows).toHaveLength(1)
  })

  it('gives the two workload exports the same five columns under different names', () => {
    const row: WorkRow = {
      s: { ...newPerson(), n: 'Asha Rao' },
      done: 7,
      pend: 3,
      tot: 10,
      pct: 70,
      items: [],
      stages: {},
    }
    const staff = workloadCsv([row], false)

    expect(staff.name).toBe('staff-workload')
    expect(toCSV(staff.rows)).toBe('Staff,Completed,Pending,Total,% complete\r\nAsha Rao,7,3,10,70')
    expect(workloadCsv([], true).rows[0]).toEqual([
      'Department',
      'Completed',
      'Pending',
      'Total',
      '% complete',
    ])
  })
})
