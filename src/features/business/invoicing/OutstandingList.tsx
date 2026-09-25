import { Rows } from '@/shared/ui/DetailList'
import { ISTATUS } from '@/data/business'
import { labelOf, money } from '@/shared/lib/format'
import { balance } from '@/domain/invoices/invoices'
import type { Invoice } from '@/data/types'
import { Note } from '@/shared/ui/Layout'

export function OutstandingList({ owing }: { owing: Invoice[] }) {
  return (
    <>
      {owing.length ? (
        <Rows>
          {owing.map((i) => (
            <div className="rw" key={i.id}>
              <span className={i.st === 'overdue' ? 'bad' : 'gr'}>·</span>
              <span>
                <b>
                  {i.cl} · {i.m}
                </b>
                <div className="sd">
                  invoiced {money(i.amt)}
                  {i.paid ? `, ${money(i.paid)} received` : ', nothing received'} ·{' '}
                  {labelOf(ISTATUS, i.st)[0].toLowerCase()}
                </div>
              </span>
              <span className={`mono ${i.st === 'overdue' ? 'bad' : 'gr'}`}>
                {money(balance(i))}
              </span>
            </div>
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          Everything in scope has been settled.
        </Note>
      )}
      <Note top={12}>
        Follows whatever client and date filters are set above, so this total and the card always
        agree.
      </Note>
    </>
  )
}
