import { iso } from './format'
import { now } from './clock'

export type CsvRow = (string | number | null | undefined)[]

const BOM = '\u{FEFF}'

const FORMULA = /^[=+\-@\t\r]/
const PLAIN_NUMBER = /^-?\d+(?:,\d{3})*(?:\.\d+)?$/

export function inert(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return String(v)
  return FORMULA.test(v) && !PLAIN_NUMBER.test(v) ? `'${v}` : v
}

export function toCSV(rows: CsvRow[]): string {
  const q = (v: string | number | null | undefined) => {
    const t = inert(v)
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  return rows.map((r) => r.map(q).join(',')).join('\r\n')
}

export const csvName = (thing: string) => `${thing}-${iso(now())}.csv`

export interface CsvResult {
  name: string
  rows: CsvRow[]
  csv: string
}

export function downloadCSV(name: string, rows: CsvRow[]): CsvResult {
  const csv = toCSV(rows)
  const result: CsvResult = { name, rows, csv }
  try {
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      URL.revokeObjectURL(a.href)
      a.remove()
    }, 0)
  } catch {
    return result
  }
  return result
}
