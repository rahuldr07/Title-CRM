import { Btn } from '@/shared/ui/Button'
import { SectionHead } from '@/shared/ui/PageHead'
import { fmtDate } from '@/shared/lib/format'
import { inr } from '@/domain/company/money'
import type { PettyConfig } from '@/data/types'
import type { LedgerRow } from './petty'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const LEDGER_COLS = '105px 1fr 150px 120px 120px 120px 130px'

export function PettyLedger({ rows, cfg, onAdd }: { rows: LedgerRow[]; cfg: PettyConfig; onAdd: () => void }) {
  return (
    <>
      <SectionHead>The ledger</SectionHead>
      <FlexTable
        cols={LEDGER_COLS}
        min={1020}
        head={['Date', 'What for', 'Who', 'Credit', 'Debit', 'Balance', 'Voucher']}
      >
        {!rows.length ? (
          <div className="empty" style={{ padding: '26px 10px' }}>
            <span className="ei">·</span>
            <p>
              No entries yet. The first one is normally the opening float going in — until
              then the box holds nothing and there is nothing to reconcile.
            </p>
            <Btn small onClick={onAdd}>
              ＋ First entry
            </Btn>
          </div>
        ) : (
          rows.map((e) => (
            <FlexRow key={e.id}>
              <Cell>
                <div className="v mono" style={{ fontSize: 'var(--t-small)' }}>
                  {fmtDate(e.d)}
                </div>
              </Cell>
              <Cell>
                <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                  {e.what}
                </div>
                {e.kind === 'debit' && e.amt > cfg.limit ? (
                  <div className="s warn">above the {inr(cfg.limit)} ceiling</div>
                ) : null}
              </Cell>
              <Cell>
                <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                  {e.by}
                </div>
              </Cell>
              <Cell>
                <div className={`v mono ${e.kind === 'credit' ? 'ok' : 'gr'}`}>
                  {e.kind === 'credit' ? inr(e.amt) : '—'}
                </div>
              </Cell>
              <Cell>
                <div className={`v mono ${e.kind === 'debit' ? 'warn' : 'gr'}`}>
                  {e.kind === 'debit' ? inr(e.amt) : '—'}
                </div>
              </Cell>
              <Cell>
                <div className="v mono" style={{ fontWeight: 650 }}>
                  {inr(e.after)}
                </div>
                <div className="s gr">was {inr(e.before)}</div>
              </Cell>
              <Cell>
                {e.receipt ? (
                  <span className="ok" style={{ fontSize: 'var(--t-small)' }}>
                    ✓ {e.ref}
                  </span>
                ) : (
                  <span className="bad" style={{ fontSize: 'var(--t-small)' }}>
                    none
                  </span>
                )}
              </Cell>
            </FlexRow>
          ))
        )}
      </FlexTable>
      <Note top={10}>
        Every row shows the balance before and after, because{' '}
        <b>previous + credit − debit = new balance</b> is the only check that catches a mistake at
        the moment it is made rather than at the month end. The running figure is computed from the
        entries — there is nowhere to type it.
      </Note>
    </>
  )
}
