import { OLDSLABS, OLDSTD, STDDED, TAXSLABS } from '@/data/hrms'
import { currentPayCfg } from '@/domain/company/company'
import type { PayConfig, Person } from '@/data/types'

export interface Structure {
  ctc: number
  monthly: number
  basic: number
  hra: number
  special: number
  gross: number
  epfEr: number
  grat: number
  pfWage: number
}

export function structureOf(p: Pick<Person, 'ctc'>, cfg: PayConfig = currentPayCfg()): Structure {
  const ctc = p.ctc ?? 0
  const m = ctc / 12
  const basic = Math.round((m * cfg.basicPct) / 100)
  const hra = Math.round((basic * cfg.hraPctOfBasic) / 100)
  const pfWage = cfg.pfOnFullBasic ? basic : Math.min(basic, cfg.pfWageCeiling)
  const epfEr = Math.round((pfWage * cfg.pfPct) / 100)
  const grat = Math.round((basic * cfg.gratuityPct) / 100)
  const special = Math.max(0, Math.round(m - epfEr - grat - basic - hra))
  return { ctc, monthly: Math.round(m), basic, hra, special, gross: basic + hra + special, epfEr, grat, pfWage }
}

function slabTax(ti: number, slabs: [number, number][], rebateUnder: number): number {
  let tax = 0
  let prev = 0
  for (const [cap, rate] of slabs) {
    if (ti > prev) tax += ((Math.min(ti, cap) - prev) * rate) / 100
    prev = cap
    if (ti <= cap) break
  }
  if (ti <= rebateUnder) tax = 0
  return Math.round(tax * 1.04)
}

export function taxUnder(regime: 'new' | 'old', gross12: number, declared = 0): number {
  if (regime === 'new') return slabTax(Math.max(0, gross12 - STDDED), TAXSLABS, 1200000)
  return slabTax(Math.max(0, gross12 - OLDSTD - declared), OLDSLABS, 500000)
}
