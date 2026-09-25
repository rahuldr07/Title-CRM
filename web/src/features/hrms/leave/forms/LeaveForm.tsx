import { useStageName } from '@/domain/company/naming'
import { useMemo, useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input, Select } from '@/shared/ui/Controls'
import { fileLeave, useLeavePolicy, useLeaveTypes } from '@/domain/leave/leaveStore'
import { useLeaveBalance } from '@/domain/leave/balance'
import { useSession } from '@/domain/auth/SessionProvider'
import { leaveCheck, type Note } from '@/domain/leave/leave'
import { whoName } from '@/domain/people/roster'
import { now } from '@/shared/lib/clock'
import { iso, parseIso } from '@/shared/lib/format'

const LENGTHS = Array.from({ length: 30 }, (_, i) => i + 1)

function NoteBanner({ note }: { note: Note }) {
  if (note.kind === 'plain') {
    return (
      <div className="gr" style={{ fontSize: 'var(--t-small)', marginBottom: 10 }}>
        {note.body}
      </div>
    )
  }
  return (
    <div className={`bnr ${note.kind}`} style={{ margin: '0 0 10px' }}>
      <span className="bi">{note.kind === 'v' ? '✓' : note.kind === 'd' ? '⚑' : '◷'}</span>
      <div>
        {note.title ? <b>{note.title}</b> : null}
        {note.title ? ' ' : null}
        {note.body}
      </div>
    </div>
  )
}

export function LeaveForm({
  personId,
  startOn,
  onSent,
  onCancel,
}: {
  personId: string
  startOn?: string
  onSent: (message: string) => void
  onCancel: () => void
}) {
  const { me } = useSession()
  const stageName = useStageName()
  const types = useLeaveTypes()
  const policy = useLeavePolicy()
  const balance = useLeaveBalance(personId)
  const today = now()

  const [type, setType] = useState(types[0]?.k ?? 'pl')
  const [days, setDays] = useState(1)
  const [from, setFrom] = useState(
    () =>
      startOn ?? iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + policy.noticeDays)),
  )
  const [reason, setReason] = useState('')
  const [cover, setCover] = useState('')
  const alert = useFormAlert<'days' | 'from' | 'cover' | 'reason'>()

  const start = useMemo(() => (from ? parseIso(from) : today), [from, today])
  const end = useMemo(
    () => new Date(start.getFullYear(), start.getMonth(), start.getDate() + Math.ceil(days) - 1),
    [start, days],
  )
  const check = useMemo(
    () => leaveCheck(personId, type, days, start, end),
    [personId, type, days, start, end],
  )

  const send = () => {
    if (!(days > 0)) return alert.fail('How long?', 'days')
    if (check.blocked) {
      return alert.fail(
        `This cannot be sent as it stands. ${stageName(check.cover?.dep ?? '')} would be left below the cover the policy requires. Pick different dates, or agree with someone to swap.`,
        'from',
      )
    }
    if (check.needReason && !cover.trim()) {
      return alert.fail(
        'Say how the department will manage. It is the question your approver would ask anyway, and answering it here saves a round trip.',
        'cover',
      )
    }
    if (!reason.trim()) {
      return alert.fail('Give a reason. Whoever approves it should not have to guess or ask.', 'reason')
    }

    const refused = fileLeave(me, {
      who: personId,
      type,
      from: start,
      to: end,
      days,
      half: days === 0.5,
      reason: reason.trim(),
      clash:
        check.short > 0 && check.cover
          ? {
              dep: check.cover.dep,
              left: check.cover.left,
              team: check.cover.team,
              who: check.clash.map((x) => whoName(x.who)),
              cover: cover.trim(),
            }
          : null,
      shortNotice: check.notice < policy.noticeDays ? check.notice : null,
      overBalance: check.overBalance || null,
    })
    if (refused) return alert.fail(refused)
    onSent(
      check.short > 0
        ? 'Sent — the approver is told it leaves the department short'
        : 'Sent for approval',
    )
  }

  return (
    <Form onSubmit={send}>
      <Fields>
        <Field label="Type">
          <Select
            field
            id="lvT"
            value={type}
            onChange={setType}
            options={types.map(
              (t) =>
                [
                  t.k,
                  `${t.n}${t.annual || (balance[t.k]?.earned ?? 0) > 0 ? ` — ${balance[t.k]?.left ?? 0} left` : ''}`,
                ] as const,
            )}
          />
        </Field>
        <Field label="How long" error={alert.on('days')}>
          <Select
            field
            id="lvD"
            value={String(days)}
            onChange={(v) => setDays(parseFloat(v))}
            options={[
              ...(policy.halfDays ? [['0.5', 'Half day'] as const] : []),
              ...LENGTHS.map((x) => [String(x), `${x} day${x === 1 ? '' : 's'}`] as const),
            ]}
          />
        </Field>
      </Fields>

      <Field label="Starting" error={alert.on('from')}>
        <Input
          field
          mono
          id="lvFrom"
          type="date"
          value={from}
          min={iso(today)}
          onChange={(e) => setFrom(e.target.value)}
        />
      </Field>

      <Field label="Reason" error={alert.on('reason')}>
        <Input
          field
          id="lvR"
          value={reason}
          placeholder="Enough that whoever approves it does not have to ask"
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>

      {check.notes.map((n, i) => (
        <NoteBanner key={`${n.kind}-${i}`} note={n} />
      ))}

      {check.needReason ? (
        <Field
          label="How will the department manage?"
          hint="Asked because this leaves the department below the agreed cover. It goes to the approver with the request."
          error={alert.on('cover')}
        >
          <Input
            field
            id="lvC"
            value={cover}
            placeholder="Who is covering, or why it can wait"
            onChange={(e) => setCover(e.target.value)}
          />
        </Field>
      ) : null}

      <FormAlert alert={alert} margin="10px 0 0" />

      <div className="mf" style={{ marginTop: 16 }}>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit disabled={check.blocked}>
          Send for approval
        </Btn>
      </div>
    </Form>
  )
}
