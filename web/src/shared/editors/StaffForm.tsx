import { useStageName } from '@/domain/company/naming'
import { usePayCfg } from '@/domain/company/company'
import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Checkbox, Input, Select } from '@/shared/ui/Controls'
import { Inline, Note } from '@/shared/ui/Layout'
import { Label } from '@/shared/ui/Card'
import { AVAIL } from '@/data/people'
import { STAGES } from '@/data/org'
import { inr } from '@/domain/company/money'
import { currentDateFormat, fmtDate, fmtUsDate, parseDate, usDate } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { saveStaff, useStaff, findPerson } from '@/domain/people/roster'
import { useRoles } from '@/domain/auth/roles'
import { useSession } from '@/domain/auth/SessionProvider'
import type { Person } from '@/data/types'
import { bankFor, newPerson, suggestedEmail } from '@/domain/people/people'

export function StaffForm({
  id,
  draft,
  onCancel,
  onDone,
  onRemove,
  onNewRole,
}: {
  id?: string | undefined
  draft?: Partial<Person> | null | undefined
  onCancel: () => void
  onDone: (message: string) => void
  onRemove: (id: string) => void
  onNewRole: (typed: Partial<Person>) => void
}) {
  const staff = useStaff()
  const roles = useRoles()
  const pay = usePayCfg()
  const { me } = useSession()
  const stageName = useStageName()

  const rec = findPerson(staff, id)
  const s = { ...(rec ?? {}), ...(draft ?? {}) } as Partial<Person>

  const [n, setN] = useState(s.n ?? '')
  const [email, setEmail] = useState(s.e ?? suggestedEmail(s.n))
  const [role, setRole] = useState(s.r ?? 'staff')
  const [cap, setCap] = useState(String(s.cap ?? 16))
  const [avail, setAvail] = useState(s.avail ?? 'ok')
  const [active, setActive] = useState(s.active !== false)
  const [dep, setDep] = useState<string[]>(s.dep ?? [])
  const [mob, setMob] = useState(s.mob ?? '')
  const [addr, setAddr] = useState(s.addr ?? '')
  const [emgN, setEmgN] = useState(s.emg?.n ?? '')
  const [emgRel, setEmgRel] = useState(s.emg?.rel ?? '')
  const [emgMob, setEmgMob] = useState(s.emg?.mob ?? '')
  const [ctc, setCtc] = useState(s.ctc ? String(s.ctc) : '')
  const [doj, setDoj] = useState(s.doj ? fmtUsDate(s.doj) : '')
  const [acct, setAcct] = useState(s.bank?.acct ?? '')
  const [ifsc, setIfsc] = useState(s.bank?.ifsc ?? '')
  const [pan, setPan] = useState(s.pan ?? '')
  const [uan, setUan] = useState(s.uan ?? '')
  const [esicNo, setEsicNo] = useState(s.esicNo ?? '')
  const [aadhaar, setAadhaar] = useState(s.aadhaar ?? '')
  const alert = useFormAlert<'doj'>()

  const typed = (): Partial<Person> => ({
    n,
    e: email,
    r: role,
    cap: Math.max(0, parseInt(cap, 10) || 0),
    avail,
    active,
    dep,
  })

  const submit = () => {
    const name = n.trim()
    const mail = email.trim().toLowerCase()
    const joined = doj.trim() ? parseDate(doj) : null
    if (joined && Number.isNaN(joined.getTime())) return alert.fail(`Write the date of joining as ${currentDateFormat()}.`, 'doj')
    const saved = saveStaff(
      me,
      {
        ...(rec ?? newPerson()),
        n: name,
        e: mail,
        r: role,
        cap: Math.max(0, parseInt(cap, 10) || 0),
        avail,
        active,
        dep,
        mob: mob.trim(),
        addr: addr.trim(),
        emg: { n: emgN.trim(), rel: emgRel.trim(), mob: emgMob.trim() },
        ctc: ctc ? Number(ctc) : undefined,
        doj: joined ? usDate(joined) : '',
        bank: bankFor(name, acct, ifsc, rec?.bank),
        pan: pan.trim().toUpperCase(),
        uan: uan.trim(),
        esicNo: esicNo.trim(),
        aadhaar: aadhaar.trim(),
        conflict: dep.includes('Typing') && dep.includes('Typing QC'),
      },
      id,
    )
    if (saved.id === null) return alert.fail(saved.refused)
    onDone(id ? `${name} saved` : `${name} added`)
  }

  const roleDesc = roles.find((r) => r.id === role)?.desc ?? ''

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />

      <Fields>
        <Field label="Full name">
          <Input
            field
            id="s-n"
            placeholder="e.g. Meera Nair"
            autoComplete="off"
            value={n}
            onChange={(e) => {
              setN(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="Email">
          <Input
            field
            id="s-e"
            type="email"
            placeholder="name@company.com"
            autoComplete="off"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="Role" id="s-r" hint={roleDesc}>
          <Inline align={false} gap={7}>
            <Select
              field
              style={{ flex: 1 }}
              value={role}
              onChange={setRole}
              options={roles.map((r) => [r.id, r.n] as const)}
            />
            <Btn
              variant="ghost"
              small
              style={{ flex: 'none' }}
              title="Create a role without leaving this form"
              onClick={() => onNewRole(typed())}
            >
              ＋ New
            </Btn>
          </Inline>
        </Field>
        <Field label="Daily target" hint="How many stage tasks they can hold. Assignment never fills anyone past this.">
          <Input field mono id="s-c" type="number" min={0} max={99} value={cap} onChange={(e) => setCap(e.target.value)} />
        </Field>
        <Field label="Today">
          <Select
            field
            id="s-av"
            value={avail}
            onChange={setAvail}
            options={Object.entries(AVAIL).map(([k, v]) => [k as Person['avail'], v[0]] as const)}
          />
        </Field>
        <Field label="Employment">
          <Select
            field
            id="s-ac"
            value={active ? '1' : '0'}
            onChange={(v) => setActive(v === '1')}
            options={[
              ['1', 'Active'],
              ['0', 'Disabled'],
            ]}
          />
        </Field>
      </Fields>

      <div style={{ marginTop: 18 }}>
        <Label>Departments</Label>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {STAGES.map((x) => (
          <Field
            key={x}
            layout="wrap"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 'var(--t-body)',
              padding: '8px 11px',
              border: '1px solid var(--hair)',
              borderRadius: 9,
              background: 'var(--tint)',
            }}
            label={
              <>
                {' '}
                {stageName(x)}
              </>
            }
          >
            <Checkbox
              field
              checked={dep.includes(x)}
              onChange={(e) => setDep((d) => (e.target.checked ? [...d, x] : d.filter((y) => y !== x)))}
            />
          </Field>
        ))}
      </div>

      <Banner
        kind="b"
        icon="⚖"
        title={<span style={{ fontSize: 'var(--t-small)' }}>Pairing a stage with its own QC is allowed</span>}
        margin="16px 0 0"
      >
        <span style={{ fontSize: 'var(--t-small)' }}>
          Someone in both Typing and {stageName('Typing QC')} will simply be filtered out of QC on any order they
          typed.
        </span>
      </Banner>

      <div style={{ marginTop: 18 }}>
        <Label>Contact</Label>
      </div>
      <Fields>
        <Field label="Mobile">
          <Input field mono id="s-mob" placeholder="+91 98765 43210" autoComplete="off" value={mob} onChange={(e) => setMob(e.target.value)} />
        </Field>
        <Field label="Address" wide>
          <Input field id="s-addr" placeholder="Street, area, city, PIN" autoComplete="off" value={addr} onChange={(e) => setAddr(e.target.value)} />
        </Field>
      </Fields>

      <div style={{ marginTop: 18 }}>
        <Label>In an emergency</Label>
      </div>
      <Note margin="-4px 0 10px">
        The one part of a personnel record read in a hurry, by someone who has never opened it
        before.
      </Note>
      <Fields>
        <Field label="Who to call">
          <Input field id="s-en" placeholder="Full name" autoComplete="off" value={emgN} onChange={(e) => setEmgN(e.target.value)} />
        </Field>
        <Field label="Relationship">
          <Input field id="s-er" placeholder="Spouse" autoComplete="off" value={emgRel} onChange={(e) => setEmgRel(e.target.value)} />
        </Field>
        <Field label="Their number">
          <Input field mono id="s-em" placeholder="+91 98765 43210" autoComplete="off" value={emgMob} onChange={(e) => setEmgMob(e.target.value)} />
        </Field>
      </Fields>

      <div style={{ marginTop: 18 }}>
        <Label>Pay and statutory</Label>
      </div>
      <Note margin="-4px 0 10px">
        Payroll cannot run without these. No joining date makes the first month and gratuity wrong;
        no account number means the bank file has nowhere to send the money.
      </Note>
      <Fields>
        <Field label="Cost to company" id="s-ctc" hint="A year. Basic, HRA, PF and gratuity are all derived from it.">
          <Inline gap={8}>
            <span className="gr">{pay.sym}</span>
            <Input field mono type="number" min={0} step={1000} placeholder="360000" value={ctc} onChange={(e) => setCtc(e.target.value)} />
          </Inline>
        </Field>
        <Field label="Date of joining" error={alert.on('doj')} hint="Drives the first month’s pro-rata, leave accrual and gratuity.">
          <Input
            field
            mono
            id="s-doj"
            placeholder={fmtDate(now())}
            autoComplete="off"
            value={doj}
            onChange={(e) => {
              setDoj(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="Bank account">
          <Input field mono id="s-acct" placeholder="50100012345678" autoComplete="off" value={acct} onChange={(e) => setAcct(e.target.value)} />
        </Field>
        <Field label="IFSC">
          <Input field mono id="s-ifsc" placeholder="HDFC0000123" autoComplete="off" value={ifsc} onChange={(e) => setIfsc(e.target.value)} />
        </Field>
        <Field label="PAN" hint="Without it TDS comes off at the higher rate and Form 16 cannot be issued.">
          <Input field mono id="s-pan" placeholder="ABCPS1234D" autoComplete="off" value={pan} onChange={(e) => setPan(e.target.value)} />
        </Field>
        <Field label="UAN" hint="Their provident fund number, which follows them between employers.">
          <Input field mono id="s-uan" placeholder="100123456789" autoComplete="off" value={uan} onChange={(e) => setUan(e.target.value)} />
        </Field>
        <Field
          label="ESIC number"
          hint={`Only applies below the ${inr(pay.esiGrossLimit)} gross limit, but keep it on file either way.`}
        >
          <Input field mono id="s-esic" placeholder="3100123456789" autoComplete="off" value={esicNo} onChange={(e) => setEsicNo(e.target.value)} />
        </Field>
        <Field label="Aadhaar" hint="Held because PF and ESIC filings ask for it. Shown masked everywhere else.">
          <Input field mono id="s-aad" placeholder="1234 5678 9012" autoComplete="off" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} />
        </Field>
      </Fields>

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        {id ? (
          <Btn variant="danger" onClick={() => onRemove(id)}>
            Remove
          </Btn>
        ) : null}
        <Btn submit>{id ? 'Save changes' : 'Add staff'}</Btn>
      </FormActions>
    </Form>
  )
}
