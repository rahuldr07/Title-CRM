import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, CardHead } from '@/shared/ui/Card'
import { Field, Fields } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'
import { PageHead } from '@/shared/ui/PageHead'
import { Rows } from '@/shared/ui/DetailList'
import { RequireCap } from '@/shared/ui/RequireCap'
import { US_STATES } from '@/data/catalog'

const PLANS = ['Starter · 4 seats', 'Professional · 8 seats', 'Professional · 12 seats']

const STEPS: [string, string][] = [
  ['The company', 'Name, home state and the plan it starts on.'],
  ['People', 'Invite the first admin and the department leads.'],
  ['Counties', 'The places it can take work in — intake validates against this.'],
  ['Products', 'What it sells, at what fee, against what turnaround.'],
]

function Onboarding() {
  const navigate = useGo()
  const [name, setName] = useState('')
  const [state, setState] = useState('PA')
  const [plan, setPlan] = useState('Starter · 4 seats')

  return (
    <>
      <Btn variant="ghost" small style={{ marginBottom: 14 }} onClick={() => navigate({ to: '/dash' })}>
        ← Back
      </Btn>

      <PageHead
        title="Add a company"
        sub="A separate workspace. Staff, orders, clients, counties and quality data are private to it."
      />

      <Card padded>
        <CardHead title="The company" />
        <Fields>
          <Field label="Company name">
            <Input
              field
              value={name}
              placeholder="Cascade Abstract"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Home state">
            <Select
              field
              value={state}
              onChange={setState}
              options={Object.entries(US_STATES).map(([k, v]) => [k, `${k} — ${v}`] as const)}
            />
          </Field>
          <Field label="Plan" hint="Seats can change later; the plan sets the ceiling.">
            <Select field value={plan} onChange={setPlan} options={PLANS.map((x) => [x, x] as const)} />
          </Field>
        </Fields>
        <Banner kind="b" icon="ⓘ" margin="16px 0 0">
          A workspace is created on the server, which is not connected yet. Nothing typed here is
          saved and no company is added.
        </Banner>
        <div style={{ marginTop: 16 }}>
          <Btn disabled>Create the workspace</Btn>
        </div>
      </Card>

      <Card top={16}>
        <CardHead title="What happens next" />
        <Rows>
          {STEPS.map(([title, detail], i) => (
            <div className="rw" key={title}>
              <span className="stepn">
                <span className={`sn${i === 0 ? ' now' : ''}`}>{i + 1}</span>
              </span>
              <span>
                <b>{title}</b>
                <div className="sd">{detail}</div>
              </span>
              <span />
            </div>
          ))}
        </Rows>
      </Card>
    </>
  )
}

export default function OnboardingRoute() {
  return (
    <RequireCap cap="people">
      <Onboarding />
    </RequireCap>
  )
}
