import { INVOICES } from '@/data/business'
import { createStore, useStore } from '@/lib/store'
import { r2 } from '@/lib/format'

/* Payments taken against invoices this session, by invoice. The register could
   not record one, so nothing on it could move from owed to paid; the bundled
   register itself is left as it was loaded. */
const store = createStore<Record<string, number>>({})

export const usePayments = (): Record<string, number> => useStore(store)

export const paidSince = (invoiceId: string): number => store.get()[invoiceId] ?? 0

export function recordPayment(invoiceId: string, amount: number): string | null {
  const inv = INVOICES.find((i) => i.id === invoiceId)
  if (!inv) return 'That invoice is not in the register.'
  if (!(amount > 0)) return 'A payment has to be above zero.'
  const owed = r2(inv.amt - inv.paid - paidSince(invoiceId))
  if (r2(amount) > owed) return `That is more than the ${owed.toFixed(2)} still owed on ${invoiceId}.`
  store.update((all) => ({ ...all, [invoiceId]: r2((all[invoiceId] ?? 0) + amount) }))
  return null
}

export const resetPayments = store.reset
