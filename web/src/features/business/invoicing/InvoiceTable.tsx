import { Empty } from '@/shared/ui/Banner'
import { Btn, LinkButton } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { ISTATUS } from '@/data/business'
import { fmtDate, labelOf, money } from '@/shared/lib/format'
import { balance } from '@/domain/invoices/invoices'
import type { Invoice } from '@/data/types'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'

const COLS = '160px 150px 120px 90px 130px 130px 130px 110px 150px'

export function InvoiceTable({
  rows,
  scope,
  onPay,
  onClear,
  onClient,
}: {
  rows: Invoice[]
  scope: string
  onPay: (i: Invoice) => void
  onClear: () => void
  onClient: (code: string) => void
}) {
  return (
    <FlexTable
      cols={COLS}
      min={1130}
      head={['Invoice', 'Client', 'Month', 'Orders', 'Amount', 'Paid', 'Outstanding', 'Status', '']}
    >
      {rows.length ? (
        rows.map((i: Invoice) => (
          <FlexRow key={i.id}>
            <Cell>
              <div className="v mono">{i.id}</div>
              <div className="s">issued {fmtDate(i.issued)}</div>
            </Cell>
            <Cell>
              <div className="v">
                <LinkButton onClick={() => onClient(i.cl)}>{i.cl}</LinkButton>
              </div>
              <div className="s">{i.code}</div>
            </Cell>
            <Cell>
              <div className="v">{i.m}</div>
            </Cell>
            <Cell>
              <div className="v mono">{i.orders.toLocaleString()}</div>
            </Cell>
            <Cell>
              <div className="v mono">{money(i.amt)}</div>
            </Cell>
            <Cell>
              <div className={`v mono ${i.paid ? 'ok' : 'gr'}`}>
                {i.paid ? money(i.paid) : '—'}
              </div>
            </Cell>
            <Cell>
              <div className={`v mono ${balance(i) > 0 ? 'warn' : 'gr'}`}>
                {balance(i) > 0 ? money(balance(i)) : '—'}
              </div>
            </Cell>
            <Cell>
              <Chip kind={labelOf(ISTATUS, i.st)[1]}>{labelOf(ISTATUS, i.st)[0]}</Chip>
            </Cell>
            <Cell>
              {balance(i) > 0 ? (
                <Btn small variant="ghost" onClick={() => onPay(i)}>
                  Record payment
                </Btn>
              ) : null}
            </Cell>
          </FlexRow>
        ))
      ) : (
        <Empty
          icon="$"
          action={
            <Btn small variant="ghost" onClick={onClear}>
              Clear filters
            </Btn>
          }
        >
          No invoices match {scope}.
        </Empty>
      )}
    </FlexTable>
  )
}
