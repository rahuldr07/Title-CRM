import { describe, expect, it } from 'vitest'
import { ASSIGN_STAGES, STAGES } from '@/data/org'
import { blankOrder, draftProblem, duplicateOf, feeFor, orderFromDraft } from './newOrder'

describe('a blank order draft', () => {
  it('starts on the first active client, PRLP, standard, effective today', () => {
    expect(blankOrder()).toMatchObject({ st: 'PA', product: 'PRLP', tier: 'standard', eff: '08/03/2026' })
    expect(blankOrder().client).not.toBe('')
  })
})

describe('the fee', () => {
  it('adds the tier uplift to the product fee, to the cent', () => {
    expect(feeFor(0.1, 0.2)).toBe(0.3)
    expect(feeFor(125, 0)).toBe(125)
  })
})

describe('a duplicate order', () => {
  const orders = [{ cl: 'MGR', prop: ' 12 Main St ', id: 'a' }]

  it('matches the same client on the same address, ignoring case and spaces', () => {
    expect(duplicateOf({ addr: '12 main st', client: 'MGR' }, () => orders)?.id).toBe('a')
  })

  it('is not another client’s order', () => {
    expect(duplicateOf({ addr: '12 Main St', client: 'CSS' }, () => orders)).toBeUndefined()
  })

  it('is not looked for before an address is typed', () => {
    expect(duplicateOf({ addr: '  ', client: 'MGR' }, () => { throw new Error('read') })).toBeUndefined()
  })
})

describe('what stops an order being created', () => {
  const ok = { addr: '12 Main St', county: 'Cambria', client: 'MGR' }

  it('asks for the address, then the county, then the client', () => {
    expect(draftProblem({ ...ok, addr: ' ' })).toEqual({ field: 'addr', message: 'A property address is required.' })
    expect(draftProblem({ ...ok, county: '' })).toMatchObject({ field: 'county', message: expect.stringMatching(/^A county is required/) })
    expect(draftProblem({ ...ok, client: '' })).toEqual({ field: 'client', message: 'Choose a client.' })
    expect(draftProblem(ok)).toBeNull()
  })
})

describe('the order a draft becomes', () => {
  it('trims the address and county and starts in search', () => {
    const due = new Date(2026, 7, 4)
    const recv = new Date(2026, 7, 3)
    const o = orderFromDraft(
      { ...blankOrder(), addr: ' 12 Main St ', county: ' Cambria ', client: 'MGR' },
      { id: 'X-1', due, fee: 99, recv },
    )
    expect(o).toMatchObject({ id: 'X-1', cl: 'MGR', prop: '12 Main St', co: 'Cambria', stt: 'search', age: 'just arrived', due, recv, fee: 99 })
  })

  it('arrives with every stage open, for the engine to place when it is taken in', () => {
    const o = orderFromDraft(blankOrder(), { id: 'X-1', due: new Date(2026, 7, 4), fee: 1, recv: new Date(2026, 7, 3) })
    expect(Object.keys(o.a)).toEqual([...STAGES])
    expect(ASSIGN_STAGES.filter((s) => o.a[s])).toEqual([])
  })
})
