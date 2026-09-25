import { Card, Label } from '@/shared/ui/Card'
import { Field, Fields } from '@/shared/ui/Form'
import { Input, Select, Textarea } from '@/shared/ui/Controls'
import { Note } from '@/shared/ui/Layout'
import { Seg } from '@/shared/ui/Tabs'
import { PRODUCTS, US_STATES } from '@/data/catalog'
import { useCoverage } from '@/domain/counties/counties'
import type { Client } from '@/data/types'
import { TIERS } from '@/domain/assignment/sla'
import { money } from '@/shared/lib/format'
import type { Draft } from './fromMail'
import type { DraftField } from './newOrder'

const STATES = Object.keys(US_STATES).sort()

interface Props {
  f: Draft
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void
  clients: readonly Client[]
  pricing: boolean
  errorOn: (field: DraftField) => string | undefined
}

export function NewOrderForm({ f, set, clients, pricing, errorOn }: Props) {
  const { counties } = useCoverage()
  return (
    <div>
      <Card padded>
        <Label>Property</Label>
        <Fields>
          <Field label="Address" wide error={errorOn('addr')}>
            <Input field id="n-ad" value={f.addr} placeholder="Street, city" onChange={(e) => set('addr', e.target.value)} />
          </Field>
          <Field label="County" id="n-co" error={errorOn('county')}>
            <Input
              field
              list="n-colist"
              value={f.county}
              placeholder="e.g. Cambria"
              onChange={(e) => set('county', e.target.value)}
            />
            <datalist id="n-colist">
              {counties.map((c) => (
                <option key={`${c.n}-${c.st}`} value={c.n}>
                  {c.n}, {c.st}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="State">
            <Select field id="n-st" value={f.st} onChange={(v) => set('st', v)} options={STATES.map((s) => [s, s] as const)} />
          </Field>
          <Field label="Parcel ID">
            <Input field mono id="n-pi" value={f.parcel} placeholder="optional" onChange={(e) => set('parcel', e.target.value)} />
          </Field>
        </Fields>
      </Card>

      <Card padded top={16}>
        <Label>Order</Label>
        <Fields>
          <Field label="Client" error={errorOn('client')}>
            <Select
              field
              id="n-cl"
              value={f.client}
              onChange={(v) => set('client', v)}
              options={clients.filter((c) => c.active !== false).map((c) => [c.n, c.n] as const)}
            />
          </Field>
          <Field label="Their file number">
            <Input field mono id="n-rf" value={f.ref} placeholder="optional" onChange={(e) => set('ref', e.target.value)} />
          </Field>
          <Field label="Product">
            <Select
              field
              id="n-pr"
              value={f.product}
              onChange={(v) => set('product', v)}
              options={PRODUCTS.map((p) => [p.id, `${p.id} — ${p.n}`] as const)}
            />
          </Field>
          <Field label="Effective date">
            <Input field mono id="n-ef" value={f.eff} onChange={(e) => set('eff', e.target.value)} />
          </Field>
          <Field
            label="Turnaround"
            as="group"
            wide
            hint="Priority halves the SLA, rush quarters it. The due date on the right follows."
          >
            <Seg
              value={f.tier}
              onChange={(v) => set('tier', v)}
              options={TIERS.map((x) => [x.id, `${x.n}${pricing && x.up ? ` +${money(x.up)}` : ''}`] as const)}
            />
          </Field>
        </Fields>
      </Card>

      <Card padded top={16}>
        <Label>Parties</Label>
        <Fields>
          <Field label="Buyer / borrower">
            <Input field id="n-bu" value={f.buyer} onChange={(e) => set('buyer', e.target.value)} />
          </Field>
          <Field label="Seller">
            <Input field id="n-se" value={f.seller} onChange={(e) => set('seller', e.target.value)} />
          </Field>
        </Fields>
        <Note top={10}>Each name is indexed separately for the judgment and lien search. Put one name per box.</Note>
      </Card>

      <Card padded top={16}>
        <Label>Instructions to the searcher</Label>
        <Textarea
          label="Instructions to the searcher"
          id="n-in"
          placeholder="Anything the abstractor needs to know — carried through verbatim"
          value={f.instr}
          onChange={(e) => set('instr', e.target.value)}
        />
      </Card>
    </div>
  )
}
