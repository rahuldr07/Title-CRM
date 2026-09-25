import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Banner } from '@/shared/ui/Banner'
import { Btn, Press } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Controls'
import { MatrixTable, Th } from '@/shared/ui/MatrixTable'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { SectionHead } from '@/shared/ui/PageHead'
import { DayPicker } from './DayPicker'
import { assignedCsv } from '@/features/insight/reports/reportCsv'
import { useReportExport } from '@/features/insight/reports/reportExport'
import { board } from '@/domain/assignment/engine'
import { ASSIGN_STAGES } from '@/data/org'
import { AVAIL } from '@/data/people'
import { PRODUCTS } from '@/data/catalog'
import { fmtDate, iso, labelOf, parseIso } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { useStaff } from '@/domain/people/roster'
import { useOrders } from '@/domain/orders/orders'
import { receivedDays } from '@/domain/orders/received'
import { Note } from '@/shared/ui/Layout'

const val = (n: number) => (n ? <b className="mono">{n}</b> : <span className="gr">—</span>)

export function Assigned({ onOpenStaff }: { onOpenStaff: () => void }) {
  const everyone = useStaff()
  const stageName = useStageName()
  const { run } = board()
  const orders = useOrders()
  const navigate = useGo()
  const [day, setDay] = useState(() => iso(now()))
  const [dept, setDept] = useState('all')

  const as = day === 'all' ? run.assigns : run.assigns.filter((a) => a.dk === day)
  useReportExport(() => assignedCsv(as))
  const scope = day === 'all' ? `all ${run.days.length} days` : fmtDate(parseIso(day))
  const products = PRODUCTS.map((p) => p.id).filter((id) => as.some((a) => a.o.pr === id))
  const shown = ASSIGN_STAGES.filter((d) => dept === 'all' || d === dept)
  const peopleIn = (d: string) =>
    everyone.filter((s) => s.dep.includes(d)).sort((a, b) => a.n.localeCompare(b.n))

  return (
    <>
      <DayPicker value={day} days={receivedDays(orders)} onChange={setDay} />

      <Banner
        kind="b"
        icon="◔"
        title={`${as.length} assignments across ${ASSIGN_STAGES.length} departments — ${scope}`}
        actions={<Btn onClick={onOpenStaff}>Per-person detail</Btn>}
      >
        Every order passes through each department, so one order appears once per row of stages. A person
        listed with no orders was eligible but not needed.
      </Banner>

      <div style={{ margin: '16px 0 4px' }}>
        <Select
          label="Filter by department"
          style={{ minWidth: 250 }}
          value={dept}
          onChange={setDept}
          options={[
            ['all', 'All departments'] as const,
            ...ASSIGN_STAGES.map((d) => [d, `${stageName(d)} — ${as.filter((a) => a.stage === d).length}`] as const),
          ]}
        />
      </div>

      {shown.map((d) => {
        const mine = as.filter((a) => a.stage === d)
        const ppl = peopleIn(d)
        return (
          <div key={d}>
            <SectionHead>
              {stageName(d)} — {mine.length} assigned
            </SectionHead>
            <Card>
              <div className="tsc">
                <MatrixTable label={`${stageName(d)} assignments by person and product`} min={330 + products.length * 68}>
                  <thead>
                    <tr>
                      <Th style={{ width: 34 }}>#</Th>
                      <Th>{stageName(d)}</Th>
                      {products.map((p) => (
                        <Th key={p} num title={PRODUCTS.find((x) => x.id === p)?.n ?? p}>
                          {p}
                        </Th>
                      ))}
                      <Th num>Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {ppl.map((s, i) => {
                      const his = mine.filter((a) => a.who === s.id)
                      return (
                        <tr key={s.id} style={his.length ? undefined : { opacity: 0.62 }}>
                          <td className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                            {i + 1}
                          </td>
                          <td>
                            <Press
                              style={{ fontWeight: 650, color: 'var(--brand)' }}
                              onClick={() => navigate({ to: '/staff/$personId', params: { personId: s.id } })}
                            >
                              {s.n}
                            </Press>
                            {s.avail !== 'ok' ? (
                              <>
                                {' '}
                                <Chip kind="r">{labelOf(AVAIL, s.avail)[0]}</Chip>
                              </>
                            ) : null}
                          </td>
                          {products.map((p) => (
                            <td className="n" key={p} title={`${s.n} · ${p}`}>
                              {val(his.filter((a) => a.o.pr === p).length)}
                            </td>
                          ))}
                          <td className="tot">{his.length || '—'}</td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td />
                      <td style={{ fontWeight: 700 }}>All of {stageName(d)}</td>
                      {products.map((p) => (
                        <td className="tot" key={p}>
                          {mine.filter((a) => a.o.pr === p).length || '—'}
                        </td>
                      ))}
                      <td className="tot corner">{mine.length}</td>
                    </tr>
                  </tbody>
                </MatrixTable>
              </div>
            </Card>
          </div>
        )
      })}

      <Note top={10}>
        Counts come from the assignment engine, not from a separate tally, so this and the Assignment screen
        can never disagree.
      </Note>
    </>
  )
}
