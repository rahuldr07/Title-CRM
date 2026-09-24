import { describe, expect, it } from 'vitest'
import { draftFromMail } from '@/screens/orders/fromMail'
import { MAILBOX } from '@/data/intake'

/**
 * An emailed order, carried into the New order form.
 *
 * "Review & create order" opened a blank form, so everything intake had read
 * from the message — order number, property, county, product — was typed again
 * by hand, which is where title errors come from.
 */
describe('an emailed order as a draft', () => {
  const ready = MAILBOX().find((m) => m.st === 'ready')!

  it('carries the order number, property and instructions', () => {
    const d = draftFromMail(ready)
    expect(d.ref).toBe('CSSWV-635007')
    expect(d.addr).toBe('1204 Ohio Ave, Dunbar WV')
    expect(d.instr).toBe('Hold for effective date ≥ new DOT/MTG')
  })

  it('splits the county from its state', () => {
    expect(draftFromMail(ready)).toMatchObject({ county: 'Kanawha', st: 'WV' })
  })

  it('takes the client from the sender', () => {
    expect(draftFromMail(ready).client).toBe('CSS')
  })

  it('matches the product by its code or its name', () => {
    expect(draftFromMail(ready).product).toBe('Update')
    const full = { ...ready, x: [['Product', 'Two owner search']] as [string, string][] }
    expect(draftFromMail(full).product).toBe('TOS')
  })

  it('leaves out what the message did not say', () => {
    const bare = { ...ready, f: 'Someone', x: [['Order no', 'X-1']] as [string, string][] }
    const d = draftFromMail(bare)
    expect(d).toEqual({ ref: 'X-1' })
  })
})
