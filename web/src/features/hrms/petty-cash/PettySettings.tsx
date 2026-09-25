import { Card, Label } from '@/shared/ui/Card'
import type { PettyConfig } from '@/data/types'
import { setConfig } from './pettyStore'
import { useSession } from '@/domain/auth/SessionProvider'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { Field, Fields } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'

export function PettySettings({ cfg }: { cfg: PettyConfig }) {
  const { me } = useSession()
  const refuse = useRefusal()
  const num = (key: 'float' | 'limit') => (raw: string) => {
    const n = Number(raw)
    if (n > 0) refuse(setConfig(me, key, n))
  }

  return (
    <Card padded>
      <Label>How this box is run</Label>
      <Fields>
        <Field label="Float" hint="Topped back up to this when it runs low.">
          <Input
            field
            mono
            id="pc-float"
            type="number"
            min={1}
            defaultValue={cfg.float}
            key={`float-${cfg.float}`}
            onBlur={(e) => num('float')(e.target.value)}
          />
        </Field>
        <Field label="Cash ceiling" hint="Anything above goes by bank transfer against an invoice.">
          <Input
            field
            mono
            id="pc-limit"
            type="number"
            min={1}
            defaultValue={cfg.limit}
            key={`limit-${cfg.limit}`}
            onBlur={(e) => num('limit')(e.target.value)}
          />
        </Field>
      </Fields>
      <Field label="Who holds the box" style={{ marginTop: 12 }}>
        <Input
          field
          id="pc-cust"
          defaultValue={cfg.custodian}
          key={`cust-${cfg.custodian}`}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v) refuse(setConfig(me, 'custodian', v))
          }}
        />
      </Field>
      <Field label="Counted every">
        <Select
          field
          id="pc-ce"
          value={cfg.countEvery}
          onChange={(v) => refuse(setConfig(me, 'countEvery', v))}
          options={[
            ['week', 'week'],
            ['month', 'month'],
          ]}
        />
      </Field>
    </Card>
  )
}
