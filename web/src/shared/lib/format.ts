import { now } from './clock'
import { createStore } from './store'
import type { ChipKind, LabelMap } from '@/data/types'

export const TZ = 'ET'
export const TZ2 = 'IST'

const LOCAL_OFFSET_H = 9.5

export const toIst = (d: Date): Date => new Date(d.getTime() + LOCAL_OFFSET_H * 3600000)

export const pad = (n: number | string) => String(n).padStart(2, '0')

export const r2 = (n: number) => Math.round(n * 100) / 100

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY'
const dateFormat = createStore<DateFormat>('MM/DD/YYYY')

export const applyDateFormat = (f: DateFormat): void => {
  if (dateFormat.get() !== f) dateFormat.set(f)
}

export const currentDateFormat = (): DateFormat => dateFormat.get()

export const onDateFormat = (fn: () => void): (() => void) => dateFormat.subscribe(fn)

export const usDate = (d: Date): string => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`

export const fmtDate = (d: Date) =>
  dateFormat.get() === 'DD/MM/YYYY' ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : usDate(d)

export const parseUsDate = (v: string): Date => {
  const [m, d, y] = v.split('/').map(Number)
  if (m === undefined || d === undefined || y === undefined) return new Date(NaN)
  return new Date(y, m - 1, d)
}

const SLASHED = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

export const fmtUsDate = (v: string): string => (SLASHED.test(v.trim()) ? fmtDate(parseUsDate(v.trim())) : v)

export const parseDate = (v: string): Date => {
  const m = SLASHED.exec(v.trim())
  if (!m) return new Date(NaN)
  const [a, b, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const [month, day] = dateFormat.get() === 'DD/MM/YYYY' ? [b, a] : [a, b]
  const d = new Date(y, month - 1, day)
  return d.getMonth() === month - 1 && d.getDate() === day ? d : new Date(NaN)
}

export const MONTHS: readonly string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const monthLabel = (d: Date): string => `${MONTHS[d.getMonth()] ?? ''} ${d.getFullYear()}`

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parseIso = (v: string): Date => {
  const [y, m, d] = v.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) return new Date(NaN)
  return new Date(y, m - 1, d)
}

export const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const dayGap = (from: Date, to: Date): number =>
  Math.round((midnight(to).getTime() - midnight(from).getTime()) / 86400000)

export const fmtTime = (d: Date) => {
  let h = d.getHours()
  const m = pad(d.getMinutes())
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ap}`
}

export const fmtDT = (d: Date) => `${fmtDate(d)} ${fmtTime(d)}`

export const fmtHour = (hr: number): string => `${hr}:00 ${TZ}`

export const hrs = (h: number) => new Date(now().getTime() + h * 3600000)

export const signed = (n: number, sym: string, digits: string) => (n < 0 ? '\u2212' : '') + sym + digits

export const money = (n: number) =>
  signed(
    n,
    '$',
    Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  )

export const listOf = (xs: readonly string[]): string =>
  xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

export const initials = (n: string) =>
  n
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase()

export const labelOf = (map: LabelMap, key: string): [label: string, kind: ChipKind] => map[key] ?? [key, 'n']

export const daysSince = (d: Date) => Math.floor((now().getTime() - d.getTime()) / 86400000)

export function webHref(address: string): string | null {
  const u = address.trim()
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(u) ? `https://${u}` : null
}
