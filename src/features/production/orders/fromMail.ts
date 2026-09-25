import { PRODUCTS, US_STATES } from '@/data/catalog'
import type { MailItem } from '@/data/types'
import { currentClients } from '@/domain/company/clients'

export interface Draft {
  addr: string
  county: string
  st: string
  parcel: string
  client: string
  product: string
  ref: string
  eff: string
  buyer: string
  seller: string
  instr: string
  tier: string
}

const field = (m: MailItem, key: string) => m.x.find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1]?.trim()

const productOf = (said: string) =>
  PRODUCTS.find((p) => p.id.toLowerCase() === said.toLowerCase() || p.n.toLowerCase() === said.toLowerCase())?.id

export function draftFromMail(m: MailItem): Partial<Draft> {
  const d: Partial<Draft> = {}
  const ref = field(m, 'Order no')
  if (ref) d.ref = ref
  const addr = field(m, 'Property')
  if (addr) d.addr = addr
  const instr = field(m, 'Instruction')
  if (instr) d.instr = instr

  const place = field(m, 'County')
  if (place) {
    const at = place.lastIndexOf(',')
    const st = at >= 0 ? place.slice(at + 1).trim().toUpperCase() : ''
    if (st && US_STATES[st]) {
      d.county = place.slice(0, at).trim()
      d.st = st
    } else {
      d.county = place
    }
  }

  const product = field(m, 'Product')
  const id = product ? productOf(product) : undefined
  if (id) d.product = id

  const sender = m.f.split('·').pop()?.trim()
  if (sender && m.f.includes('·') && currentClients().some((c) => c.n === sender)) d.client = sender

  return d
}
