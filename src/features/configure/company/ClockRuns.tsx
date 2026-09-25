import { Field } from '@/shared/ui/Form'
import { Checkbox } from '@/shared/ui/Controls'
import { useStageName } from '@/domain/company/naming'
import { Card, Label } from '@/shared/ui/Card'
import { SecHead } from '@/shared/ui/PageHead'
import { Seg } from '@/shared/ui/Tabs'
import { setSlaClock, setPause, useClock } from '@/domain/assignment/turnaround'
import { useSession } from '@/domain/auth/SessionProvider'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { Note } from '@/shared/ui/Layout'

export function ClockRuns() {
  const { me } = useSession()
  const refuse = useRefusal()
  const clock = useClock()
  const stageName = useStageName()
  const paused = Object.values(clock.pause).filter(Boolean).length

  const field = (
    key: 'start' | 'run' | 'tz',
    label: string,
    opts: [string, string][],
    hint: string,
  ) => (
    <Field label={label} as="group" hint={hint}>
      <Seg
        options={opts}
        value={clock[key]}
        onChange={(v) => refuse(setSlaClock(me, key, v))}
      />
    </Field>
  )

  return (
    <>
      <SecHead sub="Where due dates come from. Change a number here and every new order moves with it." />

      <div className="two">
        <Card padded>
          <Label>How the clock runs</Label>
          <div style={{ display: 'grid', gap: 14 }}>
            {field(
              'start',
              'Clock starts',
              [
                ['email', 'When the email arrives'],
                ['created', 'When the order is created'],
              ],
              clock.start === 'email'
                ? 'Starting at arrival is stricter and matches what the client experienced.'
                : 'Starting at creation forgives the gap between the email landing and someone opening it — and hides it from your own reporting.',
            )}
            {field(
              'run',
              'Runs',
              [
                ['247', '24/7 including weekends'],
                ['biz', 'Business hours only'],
              ],
              clock.run === '247'
                ? 'You advertise weekend work, so the clock should not stop on Saturday.'
                : 'A Friday 4pm order would now be due Monday. Check that is what you sell before leaving it here.',
            )}
            {field(
              'tz',
              'Deadline stated in',
              [
                ['ET', 'Eastern (client)'],
                ['IST', 'IST (team)'],
              ],
              clock.tz === 'ET'
                ? 'Both are shown everywhere; this picks which one is the promise.'
                : 'The team reads its own clock, but the client’s breach is judged in theirs. Stating it in IST invites an argument you will lose.',
            )}
          </div>
        </Card>

        <Card padded>
          <Label>Pause the clock while waiting on the client</Label>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(clock.pause).map(([k, v]) => (
              <Field
                key={k}
                layout="wrap"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 'var(--t-body)',
                  padding: '9px 12px',
                  border: '1px solid var(--hair)',
                  borderRadius: 9,
                  background: v ? 'var(--tint)' : 'var(--card)',
                }}
                label={
                  <>
                    {' '}
                    <b>{k}</b>
                    <span className="gr" style={{ marginLeft: 'auto', fontSize: 'var(--t-label)' }}>
                      {v ? 'time here is not counted' : 'counts against the SLA'}
                    </span>
                  </>
                }
              >
                <Checkbox field checked={v} onChange={(e) => refuse(setPause(me, k, e.target.checked))} />
              </Field>
            ))}
          </div>
          <Note top={12}>
            A paused order still shows on the board — it just stops burning the promise.{' '}
            {paused === 0 ? (
              <b className="warn">
                Nothing is paused, so time spent waiting on the client counts against you.
              </b>
            ) : null}
          </Note>
        </Card>
      </div>

      <Card padded top={18}>
        <Label>What this produces</Label>
        <div className="rows">
          {[
            [
              'A due date on every order',
              'Computed at creation from client, product and arrival time — never typed by hand',
            ],
            ['Past due and due-within-4h counts', 'On the dashboard and in the sidebar badge'],
            ['Age in stage', `So an order sitting 11 hours in ${stageName('Doc Req')} is visible before it is late`],
            ['On-time reporting that means something', 'Measured against a promise, not a feeling'],
          ].map(([t, d]) => (
            <div className="rw" key={t}>
              <span className="ok">✓</span>
              <span>
                <b>{t}</b>
                <div className="sd">{d}</div>
              </span>
              <span />
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
