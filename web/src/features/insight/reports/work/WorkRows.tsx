import { useStageName } from '@/domain/company/naming'
import { useState, type ReactNode } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Avatar } from '@/shared/ui/Avatar'
import { Chip } from '@/shared/ui/Chip'
import { Empty } from '@/shared/ui/Banner'
import { Pill } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Controls'
import { whoName } from '@/domain/people/roster'
import type { Arrival } from '@/domain/assignment/day'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { fmtHour } from '@/shared/lib/format'
import { Inline } from '@/shared/ui/Layout'

export interface WorkItem {
  o: Arrival
  fin: boolean
  hr: number
  who?: string
  stage?: string
}

export const WORKCOLS = {
  who: '40px 150px 170px 100px 90px 120px 1fr',
  stage: '40px 150px 140px 100px 90px 130px 1fr',
} as const

export function WorkRow({
  item,
  mode,
  index,
  onOpen,
}: {
  item: WorkItem
  mode: keyof typeof WORKCOLS
  index: number
  onOpen: (orderId: string) => void
}) {
  const navigate = useGo()
  const stageName = useStageName()
  const owner = whoName(item.who ?? '')

  return (
    <FlexRow onClick={() => onOpen(item.o.id)} cols={WORKCOLS[mode]}>
      <Cell>
        <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
          {index + 1}
        </div>
      </Cell>
      <Cell>
        <div className="v mono">{item.o.id}</div>
        <div className="s">{item.o.cl}</div>
      </Cell>
      <Cell>
        {mode === 'who' ? (
          <Inline gap={7}>
            <Avatar
              name={owner}
              title={`Open ${owner}`}
              style={{ width: 21, height: 21, fontSize: 'var(--t-mini)' }}
              onClick={() =>
                item.who && navigate({ to: '/staff/$personId', params: { personId: item.who } })
              }
            />
            <div className="v" style={{ fontSize: 'var(--t-small)' }}>
              {owner}
            </div>
          </Inline>
        ) : (
          <div className="v">{stageName(item.stage ?? '')}</div>
        )}
      </Cell>
      <Cell>
        <div className="v">{item.o.pr}</div>
      </Cell>
      <Cell>
        <div className="v mono">{item.o.st}</div>
      </Cell>
      <Cell>
        <div className="v mono">{fmtHour(item.hr)}</div>
      </Cell>
      <Cell>
        {item.fin ? <Chip kind="v">Completed</Chip> : <Chip kind="r">Pending</Chip>}
      </Cell>
    </FlexRow>
  )
}

export function WorkFilter({
  filter,
  onFilter,
  counts,
  query,
  onQuery,
  shown,
  total,
}: {
  filter: string
  onFilter: (f: string) => void
  counts: { all: number; done: number; pend: number }
  query: string
  onQuery: (q: string) => void
  shown: number
  total: number
}) {
  const pills: [string, string, number][] = [
    ['all', 'All', counts.all],
    ['done', 'Completed', counts.done],
    ['pend', 'Pending', counts.pend],
  ]
  return (
    <>
      <div className="fbar" role="group" aria-label="Filter tasks">
        {pills.map(([k, label, n]) => (
          <Pill key={k} on={filter === k} urgent={k === 'pend' && !!counts.pend} count={n} onClick={() => onFilter(k)}>
            {label}
          </Pill>
        ))}
        <div className="sp">
          <Input
            label="Search order number"
            placeholder="Search order number"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
      </div>
      <p className="cnt">
        <span>ⓘ</span> Showing <b>{shown}</b> of <b>{total}</b> stage tasks
      </p>
    </>
  )
}

export function WorkTable({
  cols,
  min,
  head,
  children,
  empty,
}: {
  cols: string
  min: number
  head: string[]
  children: ReactNode
  empty: { icon: string; text: string } | null
}) {
  return (
    <FlexTable cols={cols} min={min} head={head} wrap="tbl">
      {empty ? <Empty icon={empty.icon}>{empty.text}</Empty> : children}
    </FlexTable>
  )
}

export function useWorkFilter() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const match = (items: WorkItem[]) => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (filter === 'done' && !i.fin) return false
      if (filter === 'pend' && i.fin) return false
      return !q || i.o.id.toLowerCase().includes(q)
    })
  }
  return { filter, setFilter, query, setQuery, match }
}
