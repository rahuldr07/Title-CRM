import { describe, expect, it } from 'vitest'
import { orderAsEdited, orderById } from './orders'
import { setAssignments, setOrderField } from './orderWrites'
import { markRated } from './ratings'
import { statusChoices, statusRefusal } from './statusMoves'
import { setQcRule } from '@/domain/quality/qcRules'
import { ORDERS } from '@/data/production'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const LEAD = { id: 'sk', r: 'lead', n: 'Ashok S' }
const staff = (id: string) => ({ id, r: 'staff', n: id })
const HANDS = { Search: 'us', 'Search QC': 'kb', Typing: 'dk', 'Typing QC': 'md', RTS: 'gk' }
const score = (who: string) => ({ who, scores: { acc: 5, comp: 5, fmt: 5 }, comment: '' })

const order = (stt: string) => {
  const o = must(ORDERS[0], 'a seed order')
  expect(setAssignments(ADMIN, o.id, HANDS)).toBeNull()
  expect(setOrderField(ADMIN, o.id, 'stt', stt as never)).toBeNull()
  return o.id
}
const stt = (id: string) => orderAsEdited(must(orderById(id), 'the order')).stt

describe('moving an order’s status', () => {
  it('refuses cancelling to someone on the order who does not see every order', () => {
    const id = order('search')
    expect(setOrderField(staff('us'), id, 'stt', 'canc')).toMatch(/“all”/)
    expect(stt(id)).toBe('search')
  })

  it('refuses marking Sent to someone who does not hold the order’s last stage', () => {
    const id = order('search')
    expect(setOrderField(staff('us'), id, 'stt', 'sent')).toMatch(/RTS/)
    expect(stt(id)).toBe('search')
  })

  it('lets the holder of the stage the order is on move it to the next one, and nowhere else', () => {
    const id = order('search')
    expect(setOrderField(staff('us'), id, 'stt', 'hold')).toMatch(/Search/)
    expect(setOrderField(staff('us'), id, 'stt', 'rts')).not.toBeNull()
    expect(setOrderField(staff('us'), id, 'stt', 'sq')).toBeNull()
    expect(stt(id)).toBe('sq')
    expect(setOrderField(staff('us'), id, 'stt', 'typing')).not.toBeNull()
  })

  it('lets the holder of the last stage mark it Sent once it is rated, as finishing it would', () => {
    const id = order('rts')
    expect(setOrderField(staff('gk'), id, 'stt', 'sent')).toMatch(/rat/i)
    markRated(LEAD, id, { Search: score('us'), 'Search QC': score('kb'), Typing: score('dk'), 'Typing QC': score('md'), RTS: score('gk') })
    expect(setOrderField(staff('gk'), id, 'stt', 'sent')).toBeNull()
    expect(stt(id)).toBe('sent')
  })

  it('lets someone who sees every order cancel, but not send an unrated order while rating is required', () => {
    const id = order('typing')
    expect(statusRefusal(LEAD, id, 'canc')).toBeNull()
    expect(statusRefusal(LEAD, id, 'sent')).toMatch(/rat/i)
    setQcRule(ADMIN, 'mand', false)
    expect(statusRefusal(LEAD, id, 'sent')).toBeNull()
  })
})

describe('the statuses a person is offered', () => {
  it('are only the ones they may set, with the reason the rest are missing', () => {
    const id = order('search')
    const o = orderAsEdited(must(orderById(id), 'the order'))
    const mine = statusChoices(staff('us'), o)
    expect(mine.keys).toEqual(['search', 'sq'])
    expect(mine.why).toMatch(/“all”/)
    const theirs = statusChoices(staff('kb'), o)
    expect(theirs.keys).toEqual(['search'])
    const lead = statusChoices(LEAD, o)
    expect(lead.keys).toContain('canc')
    expect(lead.keys).not.toContain('sent')
    expect(lead.why).toMatch(/rat/i)
  })
})
