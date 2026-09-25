import { useMemo } from 'react'
import { ASSIGN_STAGES } from '@/data/org'
import type { Person } from '@/data/types'
import { curIdx } from '@/domain/assignment/sla'
import { iso } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { allOrders, useOrders, type EditedOrder } from './orders'
import { receivedOn } from './received'

interface DayItem {
  o: EditedOrder
  stage: string
  fin: boolean
  hr: number
}

export interface DayLoad {
  cap: number
  carried: number
  given: number
  done: number
  onDesk: number
  pct: number
  load: number
  room: number
  items: DayItem[]
  stages: Record<string, { done: number; pend: number }>
}

type Loaded = Pick<Person, 'id' | 'cap' | 'open'>

export function dayLoadOf(person: Loaded, orders: readonly EditedOrder[] = allOrders()): DayLoad {
  const items = receivedOn(orders, iso(now())).flatMap((o) => {
    const at = curIdx(o)
    return ASSIGN_STAGES.flatMap((stage, i) =>
      o.a[stage] === person.id ? [{ o, stage, fin: i < at, hr: o.recv.getHours() }] : [],
    )
  })
  const stages: DayLoad['stages'] = {}
  for (const i of items) {
    const cell = (stages[i.stage] ??= { done: 0, pend: 0 })
    if (i.fin) cell.done++
    else cell.pend++
  }
  const done = items.filter((i) => i.fin).length
  const given = items.length
  const carried = person.open
  const load = carried + given
  return {
    cap: person.cap,
    carried,
    given,
    done,
    onDesk: given - done,
    pct: given ? Math.round((done / given) * 100) : 0,
    load,
    room: Math.max(0, person.cap - load),
    items,
    stages,
  }
}

export const useDayLoad = (person: Loaded): DayLoad => dayLoadOf(person, useOrders())

const dayLoadsOf = (people: readonly Loaded[], orders: readonly EditedOrder[] = allOrders()): Record<string, DayLoad> =>
  Object.fromEntries(people.map((p) => [p.id, dayLoadOf(p, orders)]))

export function useDayLoads(people: readonly Loaded[]): Record<string, DayLoad> {
  const orders = useOrders()
  return useMemo(() => dayLoadsOf(people, orders), [people, orders])
}

export const loadOf = (loads: Readonly<Record<string, DayLoad>>, id: string): number => loads[id]?.load ?? 0

export const teamLoad = (loads: Readonly<Record<string, DayLoad>>, team: readonly Pick<Person, 'id'>[]): number =>
  team.reduce((a, s) => a + loadOf(loads, s.id), 0)
