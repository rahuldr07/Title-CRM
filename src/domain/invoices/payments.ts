import { INVOICES } from '@/data/business'
import { createStore, useStore } from '@/shared/lib/store'
import { r2 } from '@/shared/lib/format'
import { refusal, type Actor } from '@/domain/auth/permissions'

const store = createStore<Record<string, number>>({})

export const usePayments = (): Record<string, number> => useStore(store)

export const paidSince = (invoiceId: string): number => store.get()[invoiceId] ?? 0

const PAYMENT_CAPABILITY = 'pricing'

export function recordPayment(actor: Actor, invoiceId: string, amount: number): string | null {
  const refused = refusal(actor, PAYMENT_CAPABILITY, 'Recording a payment')
  if (refused) return refused
  const inv = INVOICES.find((i) => i.id === invoiceId)
  if (!inv) return 'That invoice is not in the register.'
  if (!(amount > 0)) return 'A payment has to be above zero.'
  const owed = r2(inv.amt - inv.paid - paidSince(invoiceId))
  if (r2(amount) > owed) return `That is more than the ${owed.toFixed(2)} still owed on ${invoiceId}.`
  store.update((all) => ({ ...all, [invoiceId]: r2((all[invoiceId] ?? 0) + amount) }))
  return null
}

export const resetPayments = store.reset
