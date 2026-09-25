import { MONTHS } from '@/shared/lib/format'

const fyStart = (monthIndex: number, year: number) => (monthIndex >= 3 ? year : year - 1)

const fyLabel = (y: number) => `FY ${y}-${String((y + 1) % 100).padStart(2, '0')}`

export const fyOf = (d: Date): string => fyLabel(fyStart(d.getMonth(), d.getFullYear()))

export const fyOfMonth = (mn: string): number => {
  const [mon, yr] = mn.split(' ')
  return fyStart(MONTHS.indexOf(mon ?? ''), Number(yr))
}

export const fyOfPayMonth = (mn: string): string => fyLabel(fyOfMonth(mn))
