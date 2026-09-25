import { Btn, Press } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { SectionHead } from '@/shared/ui/PageHead'
import { RUNSTEPS } from '@/data/hrms'
import { deductionParts, nextRunAction, type PayTotals } from '@/domain/payroll/payroll'
import { inr } from '@/domain/company/money'
import type { RunRecord } from '@/domain/payroll/payruns'
import { bankProblem } from '@/shared/lib/forms'
import type { Person } from '@/data/types'
import { Inline, Note } from '@/shared/ui/Layout'

export type PayrollTab = 'The run' | 'Register' | 'Cost and statutory' | 'Leavers'

export function RunTab({
  month,
  run,
  stateLabel,
  stateNote,
  action,
  advance,
  step,
  totals,
  blockers,
  checks,
  noBank,
  noDoj,
  noCtc,
  setTab,
  openPerson,
  openPayslip,
}: {
  month: string
  run: RunRecord
  stateLabel: string
  stateNote: string
  action: ReturnType<typeof nextRunAction>
  advance: () => void
  step: number
  totals: PayTotals
  blockers: number
  checks: number
  noBank: Person[]
  noDoj: Person[]
  noCtc: Person[]
  setTab: (tab: PayrollTab) => void
  openPerson: (id: string) => void
  openPayslip: (id: string) => void
}) {
  return (
    <>
      <div className={`bnr ${run.state === 'paid' ? 'v' : run.state === 'approved' ? 'b' : 'r'}`}>
        <span className="bi">{run.state === 'paid' ? '✓' : '◷'}</span>
        <div>
          <div className="bt">
            {month} — {stateLabel}
          </div>
          {stateNote}
          {run.by && run.state !== 'draft' ? ` Approved by ${run.by}.` : ''}
        </div>
        {action ? (
          <div className="ba">
            <Btn onClick={advance}>{action[0]}</Btn>
          </div>
        ) : null}
      </div>

      <Card padded top={16}>
        <Label>The month, step by step</Label>
        <Inline align={false} gap={0} wrap style={{ marginTop: 12 }}>
          {RUNSTEPS.map((s, i) => {
            const done = i < step
            const nowAt = i === step
            return (
              <Press
                key={s[0]}
                className={`step ${done ? 'done' : nowAt ? 'now' : ''}`}
                label={`${s[0]}, ${done ? 'done' : nowAt ? 'the current step' : 'not yet'} — ${s[1]}`}
                title={
                  done
                    ? `Open what ${s[0].toLowerCase()} produced`
                    : nowAt
                      ? `What ${s[0].toLowerCase()} needs`
                      : 'Not yet — what has to happen first'
                }
                onClick={() => {
                  if (i <= 1) setTab('Register')
                  else if (i === 2) setTab('The run')
                  else if (action) advance()
                  else setTab('Register')
                }}
              >
                <span className="sh">
                  <span className="sn">{done ? '✓' : i + 1}</span>
                  <b style={{ fontSize: 'var(--t-body)', color: done || nowAt ? 'var(--ink)' : 'var(--gr)' }}>
                    {s[0]}
                  </b>
                </span>
                <span className="gr sd2">{s[1]}</span>
              </Press>
            )
          })}
        </Inline>
      </Card>

      <Kpis style={{ marginTop: 16 }}>
        <Kpi
          title="On the payroll"
          value={totals.list.length}
          tone={blockers ? 'alert' : undefined}
          detail={
            blockers ? (
              <span className="bad">{blockers} cannot be paid yet</span>
            ) : (
              'all payable'
            )
          }
          onClick={() => setTab('Register')}
        />
        <Kpi
          title="Gross earnings"
          value={inr(totals.gross)}
          detail="before deductions"
          onClick={() => setTab('Register')}
        />
        <Kpi
          title="Deductions"
          value={<span className="warn">{inr(totals.ded)}</span>}
          detail={deductionParts(totals)
            .map(([k, v]) => `${k} ${inr(v)}`)
            .join(' · ')}
          onClick={() => setTab('Cost and statutory')}
        />
        <Kpi
          title="Net payable"
          value={<span className="ok">{inr(totals.net)}</span>}
          detail={`to ${totals.list.length} bank accounts`}
          onClick={() => setTab('Register')}
        />
      </Kpis>

      {checks ? (
        <>
          <SectionHead>Check these before approving — {checks}</SectionHead>
          <Card>
            <Rows bare>
              {noBank.map((p) => (
                <Check
                  key={`bank-${p.id}`}
                  bad
                  title={`${p.n} — ${bankProblem(p.bank)?.toLowerCase() ?? 'bank details'}`}
                  detail="Their payslip is produced but a salary sent to this account would bounce. They are left out of the bank file until it is fixed."
                  action="Add account"
                  onAction={() => openPerson(p.id)}
                />
              ))}
              {noDoj.map((p) => (
                <Check
                  key={`doj-${p.id}`}
                  title={`${p.n} has no joining date`}
                  detail="They are paid a full month even if they joined halfway through it, and gratuity cannot be worked out at all."
                  action="Set date"
                  onAction={() => openPerson(p.id)}
                />
              ))}
              {noCtc.map((p) => (
                <Check
                  key={`ctc-${p.id}`}
                  bad
                  title={`${p.n} has no salary on record`}
                  detail="They are active and assigned work, but there is nothing to pay. They are left out of the run entirely, which is worse than being paid wrong."
                  action="Set salary"
                  onAction={() => openPerson(p.id)}
                />
              ))}
              {totals.lop.map((x) => (
                <Check
                  key={`lop-${x.p.id}`}
                  title={`${x.p.n} — ${x.lopDays} unpaid day${x.lopDays === 1 ? '' : 's'}`}
                  detail={`${inr(x.lopAmt)} withheld from a gross of ${inr(x.st.gross)}. Confirm the days are right before this becomes a payslip.`}
                  action="Payslip"
                  onAction={() => openPayslip(x.p.id)}
                />
              ))}
            </Rows>
          </Card>
        </>
      ) : (
        <Card padded top={16}>
          <Note margin={0}>
            Nothing to check — every active person has a salary, and nobody has unpaid days this
            month.
          </Note>
        </Card>
      )}
    </>
  )
}

function Check({
  bad,
  title,
  detail,
  action,
  onAction,
}: {
  bad?: boolean
  title: string
  detail: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="rw">
      <span className={bad ? 'bad' : 'warn'} style={{ fontSize: 'var(--t-lead)' }}>
        {bad ? '⚑' : '◷'}
      </span>
      <span>
        <b>{title}</b>
        <div className="sd">{detail}</div>
      </span>
      <span>
        <Btn variant="ghost" small onClick={onAction}>
          {action}
        </Btn>
      </span>
    </div>
  )
}
