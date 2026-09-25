import { signed } from '@/shared/lib/format'
import { currentPayCfg } from './company'

export const inr = (n: number) => signed(n, currentPayCfg().sym, Math.abs(Math.round(n)).toLocaleString('en-IN'))
export const inr2 = (n: number) =>
  signed(
    n,
    currentPayCfg().sym,
    Math.abs(Math.round(n * 100) / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  )
