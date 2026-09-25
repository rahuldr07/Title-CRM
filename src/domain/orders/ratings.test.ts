import { describe, expect, it } from 'vitest'
import { orderAsEdited, orderById } from './orders'
import { finishStage, setAssignments, setOrderField } from './orderWrites'
import { markRated, rateRefusal, ratedForSending, sendingRefusal, sessionQcEntries } from './ratings'
import { ORDERS } from '@/data/production'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const LEAD = { id: 'sk', r: 'lead', n: 'Ashok S' }
const staff = (id: string, n = id) => ({ id, r: 'staff', n })
const HANDS = { Search: 'us', 'Search QC': 'kb', Typing: 'dk', 'Typing QC': 'md', RTS: 'gk' }

const order = () => {
  const o = must(ORDERS[0], 'a seed order')
  expect(setAssignments(ADMIN, o.id, HANDS)).toBeNull()
  return o.id
}
const edited = (id: string) => orderAsEdited(must(orderById(id), 'the order'))
const score = (who: string, v = 5, comment = '') => ({ who, scores: { acc: v, comp: v, fmt: v }, comment })

describe('who may rate a stage', () => {
  it('lets whoever holds the paired QC stage rate the work it checks, and nothing else', () => {
    const id = order()
    const kb = staff('kb', 'Keerthi B')
    expect(rateRefusal(kb, edited(id), 'Search')).toBeNull()
    expect(rateRefusal(kb, edited(id), 'Typing')).toMatch(/Typing QC/)
    expect(markRated(kb, id, { Typing: score('dk') })).toMatchObject({ ok: false })
  })

  it('never lets a person rate their own stage, whatever they hold', () => {
    const id = order()
    expect(rateRefusal(staff('us'), edited(id), 'Search')).toMatch(/own/)
    expect(rateRefusal(staff('dk'), edited(id), 'Typing')).toMatch(/own/)
    const leadOnIt = { ...HANDS, Typing: 'sk' }
    expect(setAssignments(ADMIN, id, leadOnIt)).toBeNull()
    expect(rateRefusal(LEAD, edited(id), 'Typing')).toMatch(/own/)
  })

  it('lets someone who sees every order rate any stage but their own', () => {
    const id = order()
    for (const s of Object.keys(HANDS)) expect(rateRefusal(LEAD, edited(id), s)).toBeNull()
  })

  it('refuses a person on the order who holds no QC stage paired to it', () => {
    const id = order()
    expect(rateRefusal(staff('gk'), edited(id), 'Search')).toMatch(/Search QC/)
  })
})

describe('an order rated before it is sent', () => {
  const rateAll = (id: string) => {
    expect(markRated(staff('kb', 'Keerthi B'), id, { Search: score('us') })).toEqual({ ok: true })
    expect(markRated(staff('md', 'Madhu'), id, { Typing: score('dk') })).toEqual({ ok: true })
    expect(
      markRated(LEAD, id, { 'Search QC': score('kb'), 'Typing QC': score('md'), RTS: score('gk') }),
    ).toEqual({ ok: true })
  }

  it('keeps what each rater entered, stage by stage, and is rated only once every stage worked is', () => {
    const id = order()
    markRated(staff('kb', 'Keerthi B'), id, { Search: score('us') })
    expect(ratedForSending(id)).toBe(false)
    rateAll(id)
    expect(ratedForSending(id)).toBe(true)
  })

  it('does not count a rating made by the person who now holds the stage', () => {
    const id = order()
    rateAll(id)
    expect(setAssignments(ADMIN, id, { ...HANDS, RTS: 'sk' })).toBeNull()
    expect(ratedForSending(id)).toBe(false)
  })

  it('is what finishing the last stage checks', () => {
    const id = order()
    expect(setOrderField(ADMIN, id, 'stt', 'rts')).toBeNull()
    const gk = staff('gk', 'Gokul')
    expect(finishStage(gk, id)).toMatchObject({ done: false, why: expect.stringMatching(/rat/i) })
    rateAll(id)
    expect(finishStage(gk, id)).toMatchObject({ done: true, to: 'Sent' })
  })
})

describe('an order nobody has worked', () => {
  it('is not rated, so it cannot be sent while rating is required', () => {
    const o = must(ORDERS.find((x) => Object.values(x.a).every((v) => !v)), 'a seed order with nobody on it')
    expect(ratedForSending(o.id)).toBe(false)
    expect(sendingRefusal(o.id)).toMatch(/nobody has worked/)
  })
})

describe('ratings made here', () => {
  it('reach the QC log the performance screens read', () => {
    const id = order()
    expect(markRated(staff('kb', 'Keerthi B'), id, { Search: score('us', 3, 'Missed the second mortgage') })).toEqual({ ok: true })
    const [entry] = sessionQcEntries()
    expect(entry).toMatchObject({
      order: id,
      stage: 'Search',
      on: 'us',
      onName: 'Uma Sankar',
      by: 'kb',
      acc: 3,
      avg: 3,
      defect: true,
      crit: 'Accuracy',
      note: 'Missed the second mortgage',
    })
  })
})
