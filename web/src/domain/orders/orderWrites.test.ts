import { describe, expect, it } from 'vitest'
import { addOrder, orderAsEdited, orderById } from './orders'
import { addCost, addDoc, addNote, finishStage, setAssignee, setDoc, setOrderField } from './orderWrites'
import { ORDERS } from '@/data/production'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const LEAD = { id: 'sk', r: 'lead', n: 'Ashok S' }
const person = (id: string) => ({ id, r: 'staff', n: id })

const order = must(ORDERS.find((o) => o.a.Search && o.a['Search QC']), 'a seeded order with a searcher and a checker')
const edited = () => orderAsEdited(must(orderById(order.id), 'the order'))
const onIt = () => must(Object.values(order.a).find(Boolean), 'someone on the order')
const offIt = () => must(['us', 'jr', 'sm', 'pd', 'nb'].find((id) => !Object.values(order.a).includes(id)), 'someone off the order')

describe('writing to an order', () => {
  it('refuses a person who is not on it and does not see every order', () => {
    const stranger = person(offIt())
    expect(setOrderField(stranger, order.id, 'nr', 'Someone Else')).toMatch(/not assigned to you/)
    expect(addNote(stranger, order.id, 'hello')).toMatch(/not assigned to you/)
    expect(edited().nr).toBeUndefined()
  })

  it('lets the person holding the stage it is on add a note', () => {
    const holder = must(order.stt === 'search' ? order.a.Search : order.a['Search QC'], 'the stage holder')
    expect(addNote(person(holder), order.id, 'Chain looks clean')).toBeNull()
  })

  it('holds assigning to “assign”, costs to “pricing” and new orders to “all”', () => {
    const worker = person(onIt())
    expect(setAssignee(worker, order.id, 'Typing', 'us')).toMatch(/“assign”/)
    expect(addCost(LEAD, order.id, 'Copy fee', 5)).toMatch(/“pricing”/)
    expect(addOrder(worker, { ...order, id: 'NEW-X' })).toMatch(/“all”/)
    expect(addCost(ADMIN, order.id, 'Copy fee', 5)).toBeNull()
  })

  it('refuses self-review at the write, in either direction', () => {
    const a = edited().a
    const searcher = must(a.Search, 'a searcher')
    expect(setAssignee(LEAD, order.id, 'Search QC', searcher)).toMatch(/check their own work/)
    const qc = must(a['Search QC'], 'a checker')
    expect(setAssignee(LEAD, order.id, 'Search', qc)).toMatch(/check their own work/)
  })

  it('lets only the stage’s owner, or someone who assigns work, finish it', () => {
    expect(setOrderField(ADMIN, order.id, 'stt', 'search')).toBeNull()
    const owner = must(edited().a.Search, 'a searcher')
    const other = person(must(['us', 'jr', 'sm', 'pd', 'nb'].find((id) => id !== owner), 'another person'))
    expect(finishStage(other, order.id)).toMatchObject({ done: false })
    expect(finishStage(person(owner), order.id)).toMatchObject({ done: true, from: 'Search' })
  })
})

describe('what a person on an order may change', () => {
  const ID = '4192033-2'
  const UMA = { id: 'us', r: 'staff', n: 'Uma Sankar' }
  const JP = { id: 'jr', r: 'staff', n: 'JP Ramesh' }
  const now = () => orderAsEdited(must(orderById(ID), ID))
  const seeded = must(ORDERS.find((o) => o.id === ID), ID)

  it('keeps the order’s header — product, borrower, address, loan amount — to someone who sees every order', () => {
    for (const actor of [UMA, JP]) {
      expect(setOrderField(actor, ID, 'pr', 'FS+')).toMatch(/“all”/)
      expect(setOrderField(actor, ID, 'bw', 'QA Borrower')).toMatch(/“all”/)
      expect(setOrderField(actor, ID, 'ad', '1 Elsewhere')).toMatch(/“all”/)
      expect(setOrderField(actor, ID, 'la', '1')).toMatch(/“all”/)
    }
    expect(now().pr).toBe(seeded.pr)
    expect(now().due).toEqual(seeded.due)
    expect(setOrderField(LEAD, ID, 'bw', 'QA Borrower')).toBeNull()
    expect(setOrderField(ADMIN, ID, 'pr', 'FS+')).toBeNull()
  })

  it('refuses the searcher notes, documents and findings once the order has moved on to someone else’s stage, and names whose', () => {
    const why = /Search QC, which is JP Ramesh’s/
    expect(addNote(UMA, ID, 'late thought')).toMatch(why)
    expect(addDoc(UMA, ID)).toMatch(why)
    expect(setDoc(UMA, ID, 'd1', 'kind', 'Deed')).toMatch(why)
    expect(setOrderField(UMA, ID, 'vs', 'John Doe')).toMatch(why)
    expect(setOrderField(UMA, ID, 'ld', 'Lot 4')).toMatch(why)
    expect(setOrderField(UMA, ID, 'nr', 'Doe')).toMatch(why)
    expect(now().vs).toBeUndefined()
  })

  it('lets whoever holds the stage it is on add notes, documents and findings', () => {
    expect(addNote(JP, ID, 'checked')).toBeNull()
    expect(addDoc(JP, ID)).toBeNull()
    expect(setOrderField(JP, ID, 'vs', 'John Doe')).toBeNull()
    expect(setOrderField(JP, ID, 'ld', 'Lot 4')).toBeNull()
    expect(now()).toMatchObject({ vs: 'John Doe', ld: 'Lot 4' })
  })
})
