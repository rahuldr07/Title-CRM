import { Assumption, Banner, Empty } from '@/shared/ui/Banner'
import { Card, Label } from '@/shared/ui/Card'
import { DetailRow } from '@/shared/ui/DetailList'
import { LATEST_PAY_MONTH } from '@/domain/payroll/payruns'
import { payTotals } from '@/domain/payroll/payroll'
import { fyOf } from '@/domain/payroll/fiscalYear'
import { inr } from '@/domain/company/money'
import { now } from '@/shared/lib/clock'
import { setPayCfg, usePayCfg } from '@/domain/company/company'
import { useSession } from '@/domain/auth/SessionProvider'
import type { PayConfig } from '@/data/types'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { Inline, Note } from '@/shared/ui/Layout'
import { Field, Fields } from '@/shared/ui/Form'
import { Checkbox, Input } from '@/shared/ui/Controls'

const WAGE_RULE = 50

function Num({
  k,
  label,
  hint,
  suffix,
  value,
  width = 120,
  min,
  max,
}: {
  k: keyof PayConfig
  label: string
  hint: string
  suffix?: string
  value: number
  width?: number
  min?: number
  max?: number
}) {
  const { me } = useSession()
  const refuse = useRefusal()
  return (
    <Field label={label} id={`pc-${k}`} hint={hint}>
      <Inline gap={8}>
        <Input
          field
          mono
          type="number"
          step="any"
          min={min}
          max={max}
          style={{ width }}
          defaultValue={value}
          key={`${k}-${value}`}
          onBlur={(e) => refuse(setPayCfg(me, k, e.target.value))}
        />
        {suffix ? (
          <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
            {suffix}
          </span>
        ) : null}
      </Inline>
    </Field>
  )
}

export function PayrollTab() {
  const { can } = useSession()
  if (!can('pricing'))
    return (
      <Card>
        <Empty icon="⊘">
          Payroll settings decide every salary, and show what this month’s payroll comes to, so they
          need the “pricing” capability — the same one the payroll register needs. Ask a company
          admin to change your role if you should see them.
        </Empty>
      </Card>
    )
  return <PayrollSettings />
}

function PayrollSettings() {
  const { me } = useSession()
  const refuse = useRefusal()
  const pay = usePayCfg()
  const month = LATEST_PAY_MONTH
  const t = payTotals(month)

  const pfOnFull = t.list.reduce((a, x) => a + Math.round(((x.earn[0]?.[1] ?? 0) * pay.pfPct) / 100), 0)
  const gratuity = t.list.reduce((a, x) => a + x.st.grat, 0)

  const produced: [string, number][] = [
    ['Gross this month', t.gross],
    ['Employee deductions', t.ded],
    ['Net payable', t.net],
    ['Employer PF', t.erpf],
    ['Employer ESI', t.esiEr],
    ['Gratuity provisioned', gratuity],
  ]

  return (
    <>
      <div className="ch" style={{ border: 'none', padding: '2px 0 15px', alignItems: 'flex-start' }}>
        <div className="gr" style={{ fontSize: 'var(--t-small)', maxWidth: '70ch' }}>
          One set of rules, applied to every payslip. Change a number here and the whole register
          moves — nothing is stored per person except the CTC.
        </div>
      </div>

      <div className="two">
        <div>
          <Card padded>
            <Label>Salary structure</Label>
            <Fields>
              <Num
                k="basicPct"
                label="Basic as a share of CTC"
                suffix="%"
                value={pay.basicPct}
                hint="The labour codes require at least 50%. Below that the structure is not compliant, and PF and gratuity are understated."
              />
              <Num
                k="hraPctOfBasic"
                label="House rent allowance"
                suffix="% of basic"
                value={pay.hraPctOfBasic}
                hint="A share of basic. The balance of the package becomes special allowance."
              />
              <Num
                k="gratuityPct"
                label="Gratuity provision"
                suffix="% of basic"
                value={pay.gratuityPct}
                hint="Set aside monthly against the eventual payout, rather than found at exit."
              />
            </Fields>
          </Card>

          {pay.basicPct < WAGE_RULE ? (
            <Banner
              kind="d"
              icon="⚑"
              title={`Basic is below the ${WAGE_RULE}% the labour codes require`}
              top={12}
            >
              Every payslip produced at this setting understates PF and gratuity. Raise it before the
              next run.
            </Banner>
          ) : (
            <Banner kind="v" icon="✓" top={12}>
              Basic at {pay.basicPct}% meets the {WAGE_RULE}% wage rule.
            </Banner>
          )}
        </div>

        <div>
          <Card padded>
            <Label>Statutory</Label>
            <Fields>
              <Num
                k="pfPct"
                label="Provident fund"
                suffix="% of wage"
                value={pay.pfPct}
                hint="Employee contributes this; the company matches it."
              />
              <Num
                k="pfWageCeiling"
                label="PF wage ceiling"
                suffix={pay.sym}
                value={pay.pfWageCeiling}
                hint="PF is calculated on basic up to this figure unless you contribute on the full basic."
              />
              <Num
                k="esiPct"
                label="ESI — employee share"
                suffix="%"
                value={pay.esiPct}
                hint="Applies only below the gross limit beside it."
              />
              <Num
                k="esiGrossLimit"
                label="ESI gross limit"
                suffix={pay.sym}
                value={pay.esiGrossLimit}
                hint="Statutory. Anyone above it is out of ESI entirely."
              />
              <Num
                k="ptAmount"
                label="Professional tax"
                suffix={`${pay.sym} a month`}
                value={pay.ptAmount}
                hint="A state levy. Two offices in two states means two figures."
              />
            </Fields>
          </Card>

          <Field
            layout="wrap"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 'var(--t-body)',
              padding: '11px 13px',
              border: '1px solid var(--hair)',
              borderRadius: 9,
              marginTop: 12,
            }}
            label={
              <span>
                <b>Contribute PF on the full basic</b>
                <div className="sd gr">
                  Rather than capping at the {inr(pay.pfWageCeiling)} wage. More generous, and more
                  expensive — {inr(t.erpf)} becomes roughly {inr(pfOnFull)} a month.
                </div>
              </span>
            }
          >
            <Checkbox
              field
              checked={pay.pfOnFullBasic}
              onChange={(e) => refuse(setPayCfg(me, 'pfOnFullBasic', e.target.checked))}
            />
          </Field>
        </div>
      </div>

      <div className="two" style={{ marginTop: 16 }}>
        <Card padded>
          <Label>Where the state levy applies</Label>
          <Fields>
            <Field label="Professional tax state" hint="Shown on every payslip, so it should say the state you actually pay in.">
              <Input
                field
                id="pc-ptState"
                defaultValue={pay.ptState}
                key={`pt-${pay.ptState}`}
                onBlur={(e) => refuse(setPayCfg(me, 'ptState', e.target.value))}
              />
            </Field>
            <Num
              k="payDay"
              label="Salary credited on"
              value={pay.payDay}
              width={90}
              min={1}
              max={28}
              hint="Day of the following month. Stated on the payslip so nobody has to ask."
            />
          </Fields>
        </Card>

        <Card padded>
          <Label>What the current settings produce</Label>
          {produced.map(([label, value]) => (
            <DetailRow key={label} label={label} value={<b className="mono">{inr(value)}</b>} />
          ))}
          <Note top={12}>
            Recomputed as you change the settings above, across all {t.list.length} people. If a
            change here looks wrong, it will look wrong on {t.list.length} payslips.
          </Note>
        </Card>
      </div>

      <Assumption title={`Tax slabs are the new regime as notified for FY 2025-26 — it is now ${fyOf(now())}`}>
        If the slabs changed for the current year, the TDS here is out by the difference. Real TDS
        also depends on declarations, other income and prior employment. <b>Have your provider
        confirm before anyone is paid on these figures.</b>
      </Assumption>
    </>
  )
}
