import { useMemo } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Card, CardBody, CardHead, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Empty } from '@/shared/ui/Banner'
import { KeyValues } from '@/shared/ui/DetailList'
import { PageHead } from '@/shared/ui/PageHead'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { MAILBOX, MAIL_STATE } from '@/data/intake'
import { now } from '@/shared/lib/clock'
import { TZ, fmtDT } from '@/shared/lib/format'
import type { MailItem } from '@/data/types'
import { Inline } from '@/shared/ui/Layout'

const mailboxAddress = (tenantName: string) =>
  `orders@${tenantName.toLowerCase().replace(/[^a-z]/g, '')}.titlecrm.com`

function MailCard({ m }: { m: MailItem }) {
  const navigate = useGo()
  const { toast } = useUi()
  const [label, kind] = MAIL_STATE[m.st]

  const keep = () => toast('Kept as a duplicate — no order created')
  const dismiss = () => toast('Dismissed — it stays in the mailbox, not in the queue')

  return (
    <Card bottom={13}>
      <CardHead
        title={
          <div>
            <h2 style={{ fontSize: 'var(--t-lead)', margin: 0 }}>{m.s}</h2>
            <div className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 2 }}>
              {m.f} · {fmtDT(m.t)} {TZ}
            </div>
          </div>
        }
        actions={<Chip kind={kind}>{label}</Chip>}
      />

      {m.dupe ? (
        <div
          style={{
            padding: '11px 20px',
            background: 'var(--badsoft)',
            borderBottom: '1px solid color-mix(in srgb, var(--bad) 22%, transparent)',
            fontSize: 'var(--t-small)',
            color: 'var(--bad)',
            fontWeight: 500,
          }}
        >
          ⚠ {m.dupe}
        </div>
      ) : null}

      <CardBody>
        {m.at.length ? (
          <Inline wrap gap={8} align={false} style={{ marginBottom: 13 }}>
            {m.at.map((a) => (
              <span
                key={a}
                className="chip pl n"
                style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-label)' }}
              >
                📎 {a}
              </span>
            ))}
          </Inline>
        ) : null}

        <Label>Read from the message</Label>
        <KeyValues rows={m.x.map(([k, v]) => [k, v])} />

        <Inline wrap gap={8} align={false} style={{ marginTop: 15 }}>
          {m.st === 'ready' ? (
            <Btn
              onClick={() =>
                navigate({ to: '/orders/new', search: { mail: m.x.find(([k]) => k === 'Order no')?.[1] } })
              }
            >
              Review &amp; create order
            </Btn>
          ) : m.st === 'attach' && m.match ? (
            <Btn
              variant="ghost"
              onClick={() => navigate({ to: '/orders/$orderId', params: { orderId: m.match! } })}
            >
              Attach to {m.match}
            </Btn>
          ) : (
            <Btn variant="ghost" onClick={keep}>
              Keep as duplicate
            </Btn>
          )}
          <Btn variant="ghost" onClick={dismiss}>
            Dismiss
          </Btn>
        </Inline>
      </CardBody>
    </Card>
  )
}

function Intake() {
  const { tenant } = useSession()
  const navigate = useGo()
  const mails = useMemo(() => MAILBOX(now()), [])

  return (
    <>
      <PageHead
        title="Order intake"
        sub={`Mail arriving at ${mailboxAddress(tenant.name)}`}
        actions={
          <>
            <Btn variant="ghost" onClick={() => navigate({ to: '/integ' })}>
              Mailbox settings
            </Btn>
            <Btn onClick={() => navigate({ to: '/orders/new' })}>＋ Manual order</Btn>
          </>
        }
      />

      <div className="bnr b">
        <span className="bi">✉</span>
        <div>
          <div className="bt">Nothing is created automatically</div>
          We read the message and its attachments and fill the order for you. A person confirms before
          it becomes work.
          <div className="bs">
            An address misread from an email is the failure this step exists to prevent.
          </div>
        </div>
      </div>

      {mails.length ? (
        mails.map((m) => <MailCard key={m.s} m={m} />)
      ) : (
        <Card>
          <Empty icon="✓" action={<Btn small onClick={() => navigate({ to: '/orders/new' })}>Manual order</Btn>}>
            Nothing waiting. New mail to {mailboxAddress(tenant.name)} appears here.
          </Empty>
        </Card>
      )}
    </>
  )
}

export default function IntakeRoute() {
  return (
    <RequireCap cap="all">
      <Intake />
    </RequireCap>
  )
}
