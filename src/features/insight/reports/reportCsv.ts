import { stageName } from '@/domain/company/naming'
import { ASSIGN_STAGES, STAGES } from '@/data/org'
import { PRODUCTS } from '@/data/catalog'
import type { Assignment } from '@/domain/assignment/engine'
import type { DeptRow, WorkRow } from '@/domain/assignment/workload'
import { curStageOf } from '@/domain/assignment/sla'
import type { EditedOrder } from '@/domain/orders/orders'
import type { Delivery } from '@/data/deliveries'
import type { QcEntry } from '@/data/quality'
import type { CsvRow } from '@/shared/lib/csv'
import { fmtDate, r2 } from '@/shared/lib/format'
import { currentStaff } from '@/domain/people/roster'

export interface ReportCsv {
  name: string
  rows: CsvRow[]
}

export function receivedCsv(orders: EditedOrder[]): ReportCsv {
  const clients = [...new Set(orders.map((o) => o.cl))].sort()
  return {
    name: 'received',
    rows: [
      ['Client', 'Received', ...STAGES.map((s) => stageName(s)), 'Completed', 'WIP'],
      ...clients.map((c) => {
        const mine = orders.filter((o) => o.cl === c)
        const stageOf = (o: EditedOrder) => curStageOf(o)
        const done = mine.filter((o) => !stageOf(o)).length
        return [
          c,
          mine.length,
          ...STAGES.map((g) => mine.filter((o) => stageOf(o) === g).length),
          done,
          mine.length - done,
        ]
      }),
    ],
  }
}

export function assignedCsv(assigns: Assignment[]): ReportCsv {
  const products = PRODUCTS.map((p) => p.id).filter((id) => assigns.some((a) => a.o.pr === id))
  return {
    name: 'assigned',
    rows: [
      ['Department', 'Staff', ...products, 'Total'],
      ...ASSIGN_STAGES.flatMap((d) =>
        currentStaff().filter((x) => x.dep.includes(d)).map((x) => {
          const his = assigns.filter((a) => a.stage === d && a.who === x.id)
          return [stageName(d), x.n, ...products.map((p) => his.filter((a) => a.o.pr === p).length), his.length]
        }),
      ),
    ],
  }
}

export function turnaroundCsv(deliveries: Delivery[]): ReportCsv {
  return {
    name: 'on-time',
    rows: [
      [
        'Delivered',
        'Order',
        'Client',
        'Product',
        'Promise hrs',
        'Took hrs',
        'Late',
        ...ASSIGN_STAGES.map((x) => `${stageName(x)} hrs`),
      ],
      ...deliveries.map((x) => [
        fmtDate(x.d),
        x.id,
        x.cl,
        x.pr,
        x.slaH,
        r2(x.hrs),
        x.late ? 'yes' : 'no',
        ...ASSIGN_STAGES.map((g) => r2(x.st[g] ?? 0)),
      ]),
    ],
  }
}

export function qualityCsv(log: QcEntry[]): ReportCsv {
  return {
    name: 'quality',
    rows: [
      [
        'Date',
        'Order',
        'Client',
        'Product',
        'Stage',
        'Worked by',
        'Rated by',
        'Accuracy',
        'Completeness',
        'Formatting',
        'Defect',
        'Reason',
      ],
      ...log.map((x) => [
        fmtDate(x.d),
        x.order,
        x.cl,
        x.pr,
        stageName(x.stage),
        x.onName,
        x.byName,
        x.acc,
        x.comp,
        x.fmt,
        x.defect ? 'yes' : 'no',
        x.note ?? '',
      ]),
    ],
  }
}

export function workloadCsv(rows: WorkRow[] | DeptRow[], byDept: boolean): ReportCsv {
  return {
    name: byDept ? 'department-workload' : 'staff-workload',
    rows: [
      [byDept ? 'Department' : 'Staff', 'Completed', 'Pending', 'Total', '% complete'],
      ...rows.map((r) => [
        'd' in r ? stageName(r.d) : r.s.n,
        r.done,
        r.pend,
        r.tot,
        r.pct,
      ]),
    ],
  }
}
