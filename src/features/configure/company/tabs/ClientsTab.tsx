import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { SecHead } from '@/shared/ui/PageHead'
import { DataTable, type DataRow } from '@/shared/ui/DataTable'
import { useUi } from '@/shared/ui/UiProvider'
import { useClients } from '@/domain/company/clients'
import { useSession } from '@/domain/auth/SessionProvider'
import { useClientEditor } from '@/shared/editors/useClientEditor'
import { money, r2 } from '@/shared/lib/format'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import { Note } from '@/shared/ui/Layout'
import { Field } from '@/shared/ui/Form'
import { Checkbox } from '@/shared/ui/Controls'

export function ClientsTab() {
  const navigate = useGo()
  const { toast } = useUi()
  const { editClient } = useClientEditor()
  const { can } = useSession()
  const pricing = can('pricing')
  const CLIENTS = useClients()
  const [showOff, setShowOff] = useState(false)

  const list = CLIENTS.filter((c) => showOff || c.active !== false)
  const off = CLIENTS.filter((c) => c.active === false).length

  const exportClients = () =>
    downloadCSV(csvName('clients'), [
      ['Client', 'Code', 'Email', 'Phone', 'Orders', ...(pricing ? ['Invoiced', 'Outstanding'] : []), 'Status'],
      ...list.map((c) => [
        c.n,
        c.dn,
        c.e ?? '',
        c.p ?? '',
        c.orders,
        ...(pricing ? [c.total, r2(c.total - c.paid)] : []),
        c.active === false ? 'Inactive' : 'Active',
      ]),
    ])

  const rows: DataRow[] = list.map((c) => ({
    id: c.n,
    onClick: () => navigate({ to: '/clients/$clientCode', params: { clientCode: c.n } }),
    search: `${c.n} ${c.dn} ${c.e ?? ''}`,
    c: [
      { v: c.n },
      { v: c.dn, mono: true },
      { v: c.e || '—', mono: !!c.e, s: c.p || '' },
      { v: c.orders.toLocaleString(), mono: true },
      ...(pricing
        ? [
            { v: money(c.total), mono: true },
            { v: money(r2(c.total - c.paid)), mono: true },
          ]
        : []),
      { v: c.active === false ? 'Inactive' : 'Active', chip: c.active === false ? 'n' : 'v' },
    ],
  }))

  return (
    <>
      <SecHead
        sub={`${list.length} ${showOff ? 'total' : 'active'}${
          off && !showOff ? ` · ${off} inactive` : ''
        }. Each keeps its own formats, turnaround and rates.`}
        actions={
          <>
            <Field
              layout="wrap"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 24,
                fontSize: 'var(--t-small)',
                color: 'var(--gr)',
              }}
              label={<>{' '}Show inactive</>}
            >
              <Checkbox field checked={showOff} onChange={(e) => setShowOff(e.target.checked)} />
            </Field>
            <Btn
              variant="ghost"
              onClick={() => {
                const out = exportClients()
                toast(`${out.name} — ${out.rows.length - 1} clients`)
              }}
            >
              Export
            </Btn>
            <Btn onClick={() => editClient()}>＋ Add client</Btn>
          </>
        }
      />

      <DataTable
        noun="clients"
        total={list.length}
        min={pricing ? 1020 : 780}
        search="Search name, code or email"
        cols={[
          { l: 'Client', w: 170, f: 1.2 },
          { l: 'Code', w: 80 },
          { l: 'Contact', w: 200, f: 1.1 },
          { l: 'Orders', w: 90 },
          ...(pricing
            ? [
                { l: 'Invoiced', w: 120 },
                { l: 'Outstanding', w: 120 },
              ]
            : []),
          { l: 'Status', w: 100 },
        ]}
        rows={rows}
        emptyText="No client matches that."
      />

      <Note top={12}>
        {pricing
          ? 'Outstanding is invoiced minus paid, computed — never stored, so the list and the client page can’t disagree.'
          : 'What each client has been invoiced and still owes needs the “pricing” capability, so those columns are left out here and in the export.'}
      </Note>
    </>
  )
}
