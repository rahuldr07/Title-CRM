import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn, Pill } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { PAYMONTHS } from '@/data/hrms'
import { nextRunAction, paidStaff, payTotals, stepIndex } from '@/domain/payroll/payroll'
import { inr } from '@/domain/company/money'
import { csvName, downloadCSV, type CsvRow } from '@/shared/lib/csv'
import { registerRows } from '@/domain/payroll/payrollCsv'
import { bankProblem } from '@/shared/lib/forms'
import { recoverForRun } from '@/domain/loans/loanStore'
import { LATEST_PAY_MONTH, payCfgOf, runIn, runStateOf, setRunState, useRuns } from '@/domain/payroll/payruns'
import { useStaff } from '@/domain/people/roster'
import type { RunState } from '@/data/types'
import { ApproveForm } from '@/features/hrms/payroll/forms/ApproveForm'
import { Leaver } from './Leaver'
import { CostTab } from '@/features/hrms/payroll/tabs/CostTab'
import { RegisterTab } from '@/features/hrms/payroll/tabs/RegisterTab'
import { RunTab, type PayrollTab as Tab } from '@/features/hrms/payroll/tabs/RunTab'
import { bankFile } from './payrollFiles'
import { Note } from '@/shared/ui/Layout'

function Payroll() {
  const navigate = useGo()
  const { me } = useSession()
  const { toast, openModal, closeModal } = useUi()

  const runs = useRuns()
  const staff = useStaff()
  const [month, setMonth] = useState(LATEST_PAY_MONTH)
  const [tab, setTab] = useState<Tab>('The run')

  const run = runIn(runs, month)
  const [stateLabel, , stateNote] = runStateOf(run.state)
  const totals = payTotals(month)

  const onPayroll = paidStaff(month)
  const noCtc = (run.kept?.staff ?? staff).filter((x) => x.active !== false && !x.ctc)
  const noBank = onPayroll.filter((x) => bankProblem(x.bank) !== null)
  const noDoj = onPayroll.filter((x) => !x.doj)
  const leavers = onPayroll.filter((p) => p.leaving)

  const checks = noCtc.length + noBank.length + noDoj.length + totals.lop.length
  const blockers = noCtc.length + noBank.length
  const step = stepIndex(run.state)
  const action = nextRunAction(run.state)

  const TABS: [Tab, number | null][] = [
    ['The run', checks || null],
    ['Register', null],
    ['Cost and statutory', null],
    ['Leavers', leavers.length || null],
  ]

  const sub =
    tab === 'The run'
      ? `${month} · ${stateLabel} · ${onPayroll.length} people on the payroll`
      : tab === 'Register'
        ? `${month} · every figure built from CTC and this month's attendance`
        : tab === 'Cost and statutory'
          ? `${month} · what the month costs, and what has to be remitted`
          : `Full and final settlement for anyone whose last day falls in ${month}`

  const openPerson = (id: string) => navigate({ to: '/staff/$personId', params: { personId: id } })

  const openPayslip = (id: string) =>
    navigate({ to: '/payslips/$personId', params: { personId: id }, search: { m: month } })

  const setState = (to: RunState) => {
    const refused = setRunState(me, month, to)
    closeModal()
    toast(refused ?? `${month} — ${runStateOf(to)[0]}`)
  }

  const lockRun = () =>
    openModal({
      title: `Lock attendance for ${month}?`,
      body: (
        <>
          <Note plain size="body">
            Attendance is frozen at today’s figures. Payroll is then computed against a fixed set of
            numbers rather than a moving one.
          </Note>
          {noCtc.length ? (
            <div className="bnr r" style={{ margin: '12px 0 0' }}>
              <span className="bi">⚠</span>
              <div>
                <b>
                  {noCtc.length} active {noCtc.length === 1 ? 'person has' : 'people have'} no salary set
                </b>{' '}
                and will not be paid at all this month. Locking does not stop you fixing that, but it is
                easier to fix now.
              </div>
            </div>
          ) : null}
          <Note top={12}>
            {totals.list.length} people · gross {inr(totals.gross)} · net {inr(totals.net)}.
          </Note>
        </>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Not yet
          </Btn>
          <Btn onClick={() => setState('locked')}>Lock it</Btn>
        </>
      ),
    })

  const approveRun = () =>
    openModal({
      title: `Approve ${month} payroll?`,
      body: (
        <ApproveForm
          expected={me.n}
          totals={totals}
          onApprove={() => {
            const refused = recoverForRun(
              me,
              month,
              totals.list.map((x) => x.p.id),
            )
            if (refused) {
              closeModal()
              return toast(refused)
            }
            setState('approved')
          }}
          onCancel={closeModal}
        />
      ),
    })

  const publishRun = () =>
    openModal({
      title: `Publish ${totals.list.length} payslips?`,
      body: (
        <>
          <Note plain size="body">
            Every person on the run can see their {month} payslip from their own account, immediately.
          </Note>
          <Note>
            The bank file becomes available at the same time — {inr(totals.net)} across{' '}
            {totals.list.length} accounts, drawn on {payCfgOf(month).bankName}.
          </Note>
        </>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Cancel
          </Btn>
          <Btn onClick={() => setState('paid')}>Publish</Btn>
        </>
      ),
    })

  const advance = () => {
    if (run.state === 'draft') return lockRun()
    if (run.state === 'locked') return approveRun()
    if (run.state === 'approved') return publishRun()
  }

  const exportCsv = (name: string, rows: CsvRow[], noun: string) => {
    const out = downloadCSV(csvName(`${name}-${month.replace(' ', '-')}`), rows)
    toast(`${out.name} — ${out.rows.length - 1} ${noun}`)
  }

  const exportRegister = () => exportCsv('payroll-register', registerRows(totals.list), 'people')

  const exportBankFile = () => {
    const file = bankFile(me, totals.list, month)
    if (!file.rows) return toast(file.refused)
    const out = downloadCSV(csvName(`bank-file-${month.replace(' ', '-')}`), file.rows)
    toast(
      `${out.name} — ${file.payable} credit${file.payable === 1 ? '' : 's'}` +
        (file.left ? `; ${file.left} left out for bank details that would bounce` : ''),
    )
  }

  return (
    <>
      <PageHead
        title="Payroll"
        sub={sub}
        actions={
          <>
            <Btn variant="ghost" onClick={() => navigate({ to: '/company' })}>
              Settings
            </Btn>
            {tab === 'Register' ? (
              <Btn variant="ghost" onClick={exportRegister}>
                Export register
              </Btn>
            ) : null}
            {tab === 'The run' && run.state === 'paid' ? (
              <Btn onClick={exportBankFile}>Bank file</Btn>
            ) : null}
          </>
        }
      />

      <div className="fbar" role="group" aria-label="Payroll month">
        {PAYMONTHS.map((m) => {
          const [label, kind] = runStateOf(runIn(runs, m).state)
          return (
            <Pill key={m} on={month === m} onClick={() => setMonth(m)}>
              {m} <Chip kind={kind}>{label}</Chip>
            </Pill>
          )
        })}
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab}>
        {tab === 'The run' ? (
          <RunTab
            month={month}
            run={run}
            stateLabel={stateLabel}
            stateNote={stateNote}
            action={action}
            advance={advance}
            step={step}
            totals={totals}
            blockers={blockers}
            checks={checks}
            noBank={noBank}
            noDoj={noDoj}
            noCtc={noCtc}
            setTab={setTab}
            openPerson={openPerson}
            openPayslip={openPayslip}
          />
        ) : null}

        {tab === 'Register' ? <RegisterTab totals={totals} openPayslip={openPayslip} /> : null}

        {tab === 'Cost and statutory' ? <CostTab month={month} totals={totals} exportCsv={exportCsv} /> : null}

        {tab === 'Leavers' ? (
          leavers.length ? (
            leavers.map((p) => <Leaver key={p.id} p={p} onOpen={() => openPerson(p.id)} />)
          ) : (
            <Card padded>
              <Note size="body" margin={0}>
                Nobody is leaving this month. When someone is, their settlement is computed here from their
                joining date, leave balance and any advance outstanding — not worked out separately on a
                spreadsheet.
              </Note>
            </Card>
          )
        ) : null}
      </Tabs>
    </>
  )
}

export default function PayrollRoute() {
  return (
    <RequireCap cap="pricing">
      <Payroll />
    </RequireCap>
  )
}
