import { ASSIGN_STAGES } from '@/data/org'
import { board } from '@/domain/assignment/engine'
import { curIdx } from '@/domain/assignment/sla'
import { deptRows, staffRows, type DeptRow, type WorkRow, type WorkTask } from '@/domain/assignment/workload'
import { iso } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { allOrders, asArrival, openExceptions, useOrders, type EditedOrder } from './orders'
import { receivedOn } from './received'

export interface LiveWork {
  tasks: WorkTask[]
  work: Record<string, WorkRow>
  worked: WorkRow[]
  totDone: number
  totPend: number
  dwork: Record<string, DeptRow>
  depts: DeptRow[]
}

function todaysTasks(orders: readonly EditedOrder[] = allOrders()): WorkTask[] {
  return receivedOn(orders, iso(now())).flatMap((o) => {
    const at = curIdx(o)
    const arrival = asArrival(o)
    return ASSIGN_STAGES.flatMap((stage, i) => {
      const who = o.a[stage]
      return who ? [{ o: arrival, stage, who, hr: o.recv.getHours(), fin: i < at }] : []
    })
  })
}

export function liveWork(orders: readonly EditedOrder[] = allOrders()): LiveWork {
  const { ctx } = board().run
  const tasks = todaysTasks(orders)
  const work = staffRows(ctx.staff, tasks)
  const worked = Object.values(work)
    .filter((r) => r.tot > 0)
    .sort((a, b) => b.tot - a.tot)
  const dwork = deptRows(ctx, tasks, openExceptions())
  return {
    tasks,
    work,
    worked,
    totDone: worked.reduce((a, r) => a + r.done, 0),
    totPend: worked.reduce((a, r) => a + r.pend, 0),
    dwork,
    depts: ctx.stages.flatMap((d) => dwork[d] ?? []),
  }
}

export const useLiveWork = (): LiveWork => liveWork(useOrders())
