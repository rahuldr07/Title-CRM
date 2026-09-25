import { describe, expect, it } from 'vitest'
import { authorityFor, can, refusal, setServerAuthority } from './permissions'
import { setOrderField } from '@/domain/orders/orderWrites'
import { addOrder, orderById } from '@/domain/orders/orders'
import { must } from '../../../tests/must'

const UMA = { id: 'us', r: 'staff', n: 'Uma Sankar' }
const HARRY = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const ID = '4192033-2'

describe('who holds a capability, with the seed roles in force', () => {
  it('answers from the role on the person’s record', () => {
    expect(authorityFor(UMA)).toBe('seed')
    expect(can(UMA, 'all')).toBe(false)
    expect(can(HARRY, 'all')).toBe(true)
    expect(setOrderField(UMA, ID, 'bw', 'X')).toMatch(/“all”/)
  })
})

describe('who holds a capability, once the server has answered for the signed-in person', () => {
  it('gives every write the server’s answer, the same one the screen shows', () => {
    setServerAuthority(UMA.id, ['own', 'all'])
    expect(authorityFor(UMA)).toBe('server')
    expect(can(UMA, 'all')).toBe(true)
    expect(refusal(UMA, 'all', 'Anything')).toBeNull()
    expect(setOrderField(UMA, ID, 'bw', 'Server said yes')).toBeNull()
    expect(orderById(ID)).toBeDefined()
  })

  it('takes a capability away that the seed role would have granted', () => {
    setServerAuthority(HARRY.id, ['own'])
    expect(can(HARRY, 'all')).toBe(false)
    expect(addOrder(HARRY, { ...must(orderById(ID), ID), id: 'NEW-SERVER' })).toMatch(/“all”/)
    expect(refusal(HARRY, 'all', 'Taking in a new order')).toMatch(/server/)
  })

  it('answers only for the person it was given for, and goes back to the seed when cleared', () => {
    setServerAuthority(UMA.id, ['own', 'all'])
    expect(can({ id: 'jr', r: 'staff' }, 'all')).toBe(false)
    setServerAuthority(null, null)
    expect(can(UMA, 'all')).toBe(false)
  })
})
