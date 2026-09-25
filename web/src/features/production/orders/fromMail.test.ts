import { describe, expect, it } from 'vitest'
import { draftFromMail } from './fromMail'
import { MAILBOX } from '@/data/intake'
import { now } from '@/shared/lib/clock'
import { currentClients, saveClient } from '@/domain/company/clients'

const BOSS = { id: 'hw', r: 'admin' }

describe('an emailed order as a draft', () => {
  const ready = MAILBOX(now()).find((m) => m.st === 'ready')!

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

  it('knows a client added after the seed', () => {
    const base = currentClients().find((c) => c.n === 'CSS')!
    saveClient(BOSS, { ...base, n: 'NEWCO', dn: 'NEW' })
    const from = { ...ready, f: ready.f.replace(/·.*$/, '· NEWCO') }
    expect(draftFromMail(from).client).toBe('NEWCO')
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
