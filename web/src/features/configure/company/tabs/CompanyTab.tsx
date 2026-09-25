import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Field, Fields, Form, FormActions, FormAlert, ReadOnly } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'
import { Rows } from '@/shared/ui/DetailList'
import { useUi } from '@/shared/ui/UiProvider'
import { setDateFormat, setProfile, useProfile } from '@/domain/company/company'
import { useStaff } from '@/domain/people/roster'
import { fmtDate, type DateFormat } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { useState } from 'react'
import { exportEverything } from '@/features/configure/company/exportAll'
import { useSession } from '@/domain/auth/SessionProvider'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { useFormAlert } from '@/shared/hooks/useFormAlert'

const TIMEZONES = ['India Standard Time', 'Eastern', 'Central']

export function CompanyTab({ plan }: { plan: string }) {
  const { me } = useSession()
  const refuse = useRefusal()
  const profile = useProfile()
  const staff = useStaff()
  const seats = Number(/(\d+)\s*seats?/i.exec(plan)?.[1] ?? 0)
  const active = staff.filter((p) => p.active !== false).length
  const over = seats ? active - seats : 0
  const { openModal, closeModal, toast } = useUi()
  const fmt = profile.dateFormat
  const { can } = useSession()
  const pricing = can('pricing')

  const changeFormat = (v: DateFormat) => refuse(setDateFormat(me, v))

  const runExport = () => {
    const files = exportEverything(pricing)
    toast(
      pricing
        ? `${files.length} files — orders, clients, staff, invoices, county coverage`
        : `${files.length} files — orders, clients, staff, county coverage; fees and invoices need the “pricing” capability`,
    )
    return files
  }

  const confirmClose = () =>
    openModal({
      title: `Close ${profile.name}?`,
      body: <CloseWorkspace name={profile.name} onCancel={closeModal} onExport={runExport} />,
    })

  return (
    <div className="two">
      <Card padded>
        <Label>Company</Label>
        <Fields>
          <Field label="Name">
            <Input
              field
              id="co-n"
              defaultValue={profile.name}
              key={`n-${profile.name}`}
              onBlur={(e) => refuse(setProfile(me, 'name', e.target.value))}
            />
          </Field>
          <Field label="Home state">
            <Input
              field
              id="co-s"
              defaultValue={profile.state}
              key={`s-${profile.state}`}
              onBlur={(e) => refuse(setProfile(me, 'state', e.target.value))}
            />
          </Field>
          <Field label="Operating timezone" hint="Where your team sits. Client deadlines are set under Turnaround & SLA.">
            <Select
              field
              id="co-tz"
              value={profile.tz}
              onChange={(v) => refuse(setProfile(me, 'tz', v))}
              options={TIMEZONES.map((x) => [x, x] as const)}
            />
          </Field>
          <Field
            label="Date format"
            hint={
              <>
                Every screen and export — today reads <b className="mono">{fmtDate(now())}</b>.
              </>
            }
          >
            <Select<DateFormat>
              field
              id="co-df"
              value={fmt}
              onChange={changeFormat}
              options={[
                ['MM/DD/YYYY', 'MM/DD/YYYY (US)'],
                ['DD/MM/YYYY', 'DD/MM/YYYY'],
              ]}
            />
          </Field>
          <Field label="Plan" as="text">
            <ReadOnly>{plan}</ReadOnly>
            {over > 0 ? (
              <div className="hint bad">
                {active} active people on a {seats}-seat plan — {over} over.
              </div>
            ) : null}
          </Field>
        </Fields>
      </Card>

      <Card padded>
        <Label>Your data</Label>
        <Rows bare style={{ marginTop: 4 }}>
          <div className="rw">
            <span className="gr">↓</span>
            <span>
              <b>Export everything</b>
              <div className="sd">
                {pricing
                  ? 'Orders, clients, invoices, documents and quality history.'
                  : 'Orders, clients, staff and county coverage. Fees and invoices are left out: they need the “pricing” capability.'}
              </div>
            </span>
            <span>
              <Btn variant="ghost" small onClick={runExport}>
                Export
              </Btn>
            </span>
          </div>
          <div className="rw">
            <span className="bad">⚠</span>
            <span>
              <b>Close this workspace</b>
              <div className="sd">Export first — this removes access for everyone.</div>
            </span>
            <span>
              <Btn variant="danger" small onClick={confirmClose}>
                Close
              </Btn>
            </span>
          </div>
        </Rows>
      </Card>
    </div>
  )
}

function CloseWorkspace({
  name,
  onCancel,
  onExport,
}: {
  name: string
  onCancel: () => void
  onExport: () => unknown[]
}) {
  const [typed, setTyped] = useState('')
  const alert = useFormAlert<'name'>()
  const matches = typed.trim() === name

  const submit = () => {
    if (!matches) return alert.fail('The name does not match. This is deliberately awkward.', 'name')
    alert.fail(
      'Closing a workspace needs the server, which is not connected yet — access cannot be revoked from here, and this dialog will not pretend it was.',
    )
  }

  return (
    <Form onSubmit={submit}>
      <Banner kind="d" icon="⚠" title={`Every user in ${name} loses access immediately`}>
        Export first. Once this is done there is nothing to come back to.
      </Banner>

      <Field label={`Type ${name} to confirm`} style={{ marginTop: 14 }} error={alert.on('name')}>
        <Input
          field
          id="cw-n"
          autoComplete="off"
          placeholder={name}
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value)
            alert.clear()
          }}
        />
      </Field>

      <FormAlert alert={alert} margin="12px 0 0" />

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn variant="ghost" onClick={onExport}>
          Export everything
        </Btn>
        <Btn variant="danger" submit>
          Close the workspace
        </Btn>
      </FormActions>
    </Form>
  )
}
