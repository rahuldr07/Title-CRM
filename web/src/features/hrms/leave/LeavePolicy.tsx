import type { CSSProperties } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form } from '@/shared/ui/Form'
import { Checkbox, Radio } from '@/shared/ui/Controls'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { SectionHead } from '@/shared/ui/PageHead'
import { useUi } from '@/shared/ui/UiProvider'
import { useTimeclock } from '@/domain/attendance/TimeclockProvider'
import {
  removeLeaveType,
  saveLeaveType,
  setLeavePolicy,
  useLeave,
  useLeavePolicy,
  useLeaveTypes,
} from '@/domain/leave/leaveStore'
import { setTimeRule, useTimeRules, type TimeRules } from '@/domain/attendance/timeRules'
import { useSession } from '@/domain/auth/SessionProvider'
import { CLASHRULES } from '@/domain/leave/leave'
import type { LeavePolicy as Policy, LeaveType } from '@/data/types'
import { r2 } from '@/shared/lib/format'
import { NumberField, Outcome } from './PolicyFields'
import { TypeFields } from './TypeFields'
import { lateSummary, overtimeSummary } from './lateAndOvertime'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const COLS = '190px 110px 110px 120px 1fr 110px'

const OPTION: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 'var(--t-body)',
  padding: '11px 13px',
  border: '1px solid var(--hair)',
  borderRadius: 9,
  marginTop: 12,
}

export function LeavePolicy() {
  const { toast, openModal, closeModal } = useUi()
  const { me } = useSession()
  const clock = useTimeclock()
  const policy = useLeavePolicy()
  const types = useLeaveTypes()
  const time = useTimeRules()
  const requests = useLeave()

  const setPolicy = <K extends keyof Policy>(k: K, v: Policy[K]) => {
    const refused = setLeavePolicy(me, k, v)
    if (refused) toast(refused)
  }

  const setTime = <K extends keyof TimeRules>(k: K, v: TimeRules[K]) => {
    const refused = setTimeRule(me, k, v)
    if (refused) toast(refused)
  }

  const editType = (existing?: LeaveType) => {
    const held: LeaveType = existing
      ? { ...existing }
      : { k: '', n: '', annual: 0, carry: 0, enc: false, c: 'n', d: '' }
    const save = () => {
      const refused = saveLeaveType(me, held, existing?.k)
      if (refused) {
        toast(refused)
        return
      }
      closeModal()
      toast(existing ? `${held.n} saved` : `${held.n} added`)
    }
    openModal({
      title: existing ? `Edit ${existing.n}` : 'Add a leave type',
      body: (
        <Form id="lt-form" onSubmit={save}>
          <TypeFields initial={held} onChange={(d) => Object.assign(held, d)} />
        </Form>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Cancel
          </Btn>
          <Btn submit form="lt-form">
            {existing ? 'Save type' : 'Add type'}
          </Btn>
        </>
      ),
    })
  }

  const removeType = (t: LeaveType) => {
    toast(removeLeaveType(me, t.k) ?? `${t.n} removed`)
  }

  const late = lateSummary(clock.late)
  const ot = overtimeSummary(clock.overtime)

  return (
    <>
      <Card>
        <div className="ch">
          <h2>Leave types</h2>
          <div className="r">
            <Btn small onClick={() => editType()}>
              ＋ Add a type
            </Btn>
          </div>
        </div>
        <FlexTable
          cols={COLS}
          min={900}
          head={['Type', 'Days a year', 'Carries over', 'Encashable', 'How it behaves', '']}
          wrap="none"
        >
          {types.map((t) => {
            const inUse = requests.some((l) => l.type === t.k)
            return (
              <FlexRow key={t.k}>
                <Cell>
                  <Chip kind={t.c}>{t.n}</Chip>
                </Cell>
                <Cell>
                  <div className="v mono">{t.annual || '—'}</div>
                  <div className="s gr">{t.annual ? `${r2(t.annual / 12)} a month` : 'earned'}</div>
                </Cell>
                <Cell>
                  <div className={`v mono ${t.carry ? '' : 'gr'}`}>{t.carry || 'none'}</div>
                </Cell>
                <Cell>
                  {t.enc ? <Chip kind="v">Yes</Chip> : <span className="gr">No</span>}
                </Cell>
                <Cell>
                  <div className="v gr" style={{ fontSize: 'var(--t-small)' }}>
                    {t.d}
                  </div>
                </Cell>
                <Cell>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="ghost" small onClick={() => editType(t)}>
                      Edit
                    </Btn>
                    {inUse ? null : (
                      <Btn variant="danger" small onClick={() => removeType(t)}>
                        Remove
                      </Btn>
                    )}
                  </span>
                </Cell>
              </FlexRow>
            )
          })}
        </FlexTable>
      </Card>
      <Note top={10}>
        Changing a quota changes everyone’s balance from now, because a balance is earned minus taken
        rather than a stored number. A type somebody has already used cannot be removed — the history
        would stop making sense.
      </Note>

      <div className="two" style={{ marginTop: 18 }}>
        <Card padded>
          <Label>When somebody applies</Label>
          <Fields>
            <NumberField
              id="lp-noticeDays"
              label="Notice normally expected"
              value={policy.noticeDays}
              suffix="days ahead"
              hint="A request inside this is allowed, but flagged to the approver so it is a decision rather than a surprise."
              onChange={(v) => setPolicy('noticeDays', v)}
            />
            <NumberField
              id="lp-maxConsecutive"
              label="Longest single request"
              value={policy.maxConsecutive}
              suffix="days"
              hint="Beyond this the form says it needs a conversation, not just an approval."
              onChange={(v) => setPolicy('maxConsecutive', v)}
            />
          </Fields>
          <Field
            layout="wrap"
            style={OPTION}
            label={
              <span>
                <b>Allow half days</b>
                <div className="sd gr">Without them people take a whole day they did not need.</div>
              </span>
            }
          >
            <Checkbox field checked={policy.halfDays} onChange={(e) => setPolicy('halfDays', e.target.checked)} />
          </Field>
        </Card>

        <Card padded>
          <Label>When it would leave a department short</Label>
          <NumberField
            id="lp-minCover"
            label="People who must stay working"
            value={policy.minCover}
            suffix="at least"
            hint="Counted across the department for every day of the request."
            onChange={(v) => setPolicy('minCover', v)}
          />
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {Object.entries(CLASHRULES).map(([k, v]) => {
              const on = policy.clashRule === k
              return (
                <Field
                  key={k}
                  layout="wrap"
                  label={
                    <span>
                      <b>{v[0]}</b>
                      <div className="sd gr">{v[1]}</div>
                    </span>
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 'var(--t-body)',
                    padding: '11px 13px',
                    border: `1px solid ${on ? 'var(--brand)' : 'var(--hair)'}`,
                    borderRadius: 9,
                    background: on ? 'var(--brandsoft)' : 'var(--card)',
                  }}
                >
                  <Radio
                    field
                    name="clashrule"
                    checked={on}
                    onChange={() => setPolicy('clashRule', k)}
                    style={{ marginTop: 2 }}
                  />
                </Field>
              )
            })}
          </div>
          <Note top={12}>
            Blocking outright is the strictest and the most likely to be worked around — somebody will
            simply not record the day. “Ask for a reason” keeps the record honest and still puts the
            decision in front of the approver.
          </Note>
        </Card>
      </div>

      <SectionHead>Late logins</SectionHead>
      <div className="two">
        <Card padded>
          <Label>When a punch counts as late</Label>
          <Fields>
            <NumberField
              id="late-grace"
              label="Grace after the shift start"
              value={time.lateGraceMins}
              suffix="minutes"
              step={5}
              hint="A punch inside the grace period is not recorded as late at all. Zero is allowed, and it is a harsher rule than most people expect — a commute is not a decision."
              onChange={(v) => setTime('lateGraceMins', v)}
            />
          </Fields>
        </Card>
        <Card padded>
          <Label>What that rule produces right now</Label>
          <Outcome label="Late marks in the last 30 days" value={late.open} />
          <Outcome label="People affected" value={late.people} />
          <Outcome label="Repeatedly late" value={late.repeat} warn={!!late.repeat} />
          <Outcome label="Waived" value={late.waived} />
          <Note top={12}>
            Widening the grace period does not erase anything already recorded — it changes what gets
            recorded from here. The log is under <b>Attendance → Late logins</b>.
          </Note>
        </Card>
      </div>

      <SectionHead>Overtime</SectionHead>
      <div className="two">
        <Card padded>
          <Label>How it is paid</Label>
          <Fields>
            <NumberField
              id="ot-rate"
              label="Rate"
              value={time.otRate}
              suffix="× the ordinary hourly rate"
              step={0.25}
              hint="Worked out from each person's own salary, so it follows a raise without anyone updating a table."
              onChange={(v) => setTime('otRate', v)}
            />
            <NumberField
              id="ot-after"
              label="Counts as overtime after"
              value={time.otAfterMins}
              suffix={`minutes in a day — ${r2(time.otAfterMins / 60)} hours`}
              step={30}
              hint="Measured on the punches, after breaks are taken off."
              onChange={(v) => setTime('otAfterMins', v)}
            />
            <NumberField
              id="ot-cap"
              label="Most in a month"
              value={time.otMonthlyCapMins}
              suffix={`minutes — ${r2(time.otMonthlyCapMins / 60)} hours`}
              step={60}
              hint="A cap protects the person as much as the budget. Beyond it the claim is flagged rather than refused, because the work was still done."
              onChange={(v) => setTime('otMonthlyCapMins', v)}
            />
          </Fields>
          <Field
            layout="wrap"
            style={OPTION}
            label={
              <span>
                <b>Overtime must be approved before it is paid</b>
                <div className="sd gr">
                  {time.otNeedsApproval ? (
                    'A claim waits for a decision and reaches the payslip only once approved.'
                  ) : (
                    <span className="warn">
                      Off — every claim is paid as submitted. That is a lot of trust to put in a form.
                    </span>
                  )}
                </div>
              </span>
            }
          >
            <Checkbox
              field
              checked={time.otNeedsApproval}
              onChange={(e) => setTime('otNeedsApproval', e.target.checked)}
            />
          </Field>
        </Card>
        <Card padded>
          <Label>What the rules produce right now</Label>
          <Outcome label="Claims this year" value={ot.claims} />
          <Outcome label="Awaiting a decision" value={ot.pending} warn={!!ot.pending} />
          <Outcome label="Approved so far" value={ot.approved} />
          <Note top={12}>
            Changing the rate above moves what overtime costs for everyone at once. It is worth seeing
            before you save it.
          </Note>
        </Card>
      </div>
    </>
  )
}
