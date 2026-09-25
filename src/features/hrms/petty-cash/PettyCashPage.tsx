import { useMemo, useRef } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { focusElement } from '@/shared/ui/focus'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead } from '@/shared/ui/PageHead'
import { Row, Rows } from '@/shared/ui/DetailList'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { daysSince, fmtDate } from '@/shared/lib/format'
import { inr } from '@/domain/company/money'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import {
  countDue,
  lastCount,
  ledgerCsvRows,
  overCeiling,
  pettyLedger,
  spentWithin,
  total,
  unvouched,
} from './petty'
import { recordCount, recordEntry, useBox } from './pettyStore'
import { EntryForm } from '@/features/hrms/petty-cash/forms/EntryForm'
import { CountForm } from '@/features/hrms/petty-cash/forms/CountForm'
import { PettyCounts } from './PettyCounts'
import { PettyLedger } from './PettyLedger'
import { PettySettings } from './PettySettings'
import { Inline, Note } from '@/shared/ui/Layout'

const LOW = 0.2

function PettyCash() {
  const { me } = useSession()
  const { openModal, closeModal, toast } = useUi()
  const { entries, counts, cfg } = useBox()
  const countsPanel = useRef<HTMLDivElement>(null)

  const ledger = useMemo(() => pettyLedger(entries), [entries])
  const balance = ledger.at(-1)?.after ?? 0
  const noReceipt = useMemo(() => unvouched(entries), [entries])
  const overLimit = useMemo(() => overCeiling(entries, cfg), [entries, cfg])
  const recent = useMemo(() => spentWithin(entries), [entries])
  const last = lastCount(counts)
  const due = countDue(counts, cfg)

  const focusCounts = () => focusElement(countsPanel.current)

  const addEntry = () =>
    openModal({
      title: 'Petty cash entry',
      body: (
        <EntryForm
          balance={balance}
          cfg={cfg}
          onCancel={closeModal}
          onSubmit={(entry) => {
            const saved = recordEntry(me, entry)
            closeModal()
            if (typeof saved === 'string') return toast(saved)
            toast(
              `Recorded — balance ${inr(
                saved.kind === 'credit' ? balance + saved.amt : balance - saved.amt,
              )}`,
            )
          }}
        />
      ),
    })

  const openCount = () =>
    openModal({
      title: 'Count the box',
      body: (
        <CountForm
          expected={balance}
          countedBy={me.n}
          onCancel={closeModal}
          onSubmit={(count) => {
            const refused = recordCount(me, count)
            closeModal()
            if (refused) return toast(refused)
            toast(
              count.counted === balance ? 'Counted — matches' : 'Counted — difference recorded',
            )
          }}
        />
      ),
    })

  const showBalance = () =>
    openModal({
      title: 'What the box should hold',
      body: (
        <>
          <Rows>
            <Row
              icon={<span className="ok" style={{ fontSize: 'var(--t-lead)' }}>✓</span>}
              title="Put in"
              detail={`${entries.filter((e) => e.kind === 'credit').length} top-ups including the opening float`}
              right={
                <span className="mono ok">
                  {inr(total(entries.filter((e) => e.kind === 'credit')))}
                </span>
              }
            />
            <Row
              icon={<span className="bad" style={{ fontSize: 'var(--t-lead)' }}>⚑</span>}
              title="Paid out"
              detail={`${entries.filter((e) => e.kind === 'debit').length} payments`}
              right={
                <span className="mono bad">
                  −{inr(total(entries.filter((e) => e.kind === 'debit')))}
                </span>
              }
            />
          </Rows>
          <Inline align={false} justify="space-between" style={{ padding: '13px 2px 0', fontSize: 'var(--t-lead)', borderTop: '1px solid var(--hair)', marginTop: 10 }}>
            <b>Should be in the box</b>
            <b className="mono">{inr(balance)}</b>
          </Inline>
          <Note margin="14px 0 0">
            <b>Previous + credit − debit = new balance</b>, checked on every single row.{' '}
            {last
              ? `Last actually counted on ${fmtDate(last.d)} by ${last.by}.`
              : 'Nobody has counted it yet.'}{' '}
            Until someone independent counts it, this is a figure rather than a fact.
          </Note>
        </>
      ),
      footer: (
        <>
          <Btn
            variant="ghost"
            onClick={() => {
              closeModal()
              openCount()
            }}
          >
            Count the box
          </Btn>
          <Btn onClick={closeModal}>Close</Btn>
        </>
      ),
    })

  const showSpent = () =>
    openModal({
      title: `Paid out in the last 30 days — ${inr(total(recent))}`,
      body: (
        <>
          {recent.length ? (
            <Rows>
              {[...recent]
                .sort((a, b) => b.d.getTime() - a.d.getTime())
                .map((e) => {
                  const bad = !e.receipt || e.amt > cfg.limit
                  return (
                    <Row
                      key={e.id}
                      icon={
                        <span className={bad ? 'bad' : 'ok'} style={{ fontSize: 'var(--t-lead)' }}>
                          {bad ? '⚑' : '✓'}
                        </span>
                      }
                      title={e.what}
                      detail={`${fmtDate(e.d)} · ${e.by}${
                        e.receipt ? ` · voucher ${e.ref}` : ' · no voucher'
                      }`}
                      right={<span className="mono">{inr(e.amt)}</span>}
                    />
                  )
                })}
            </Rows>
          ) : (
            <Note size="body" margin={0}>
              Nothing has been paid out of the box in the last 30 days.
            </Note>
          )}
          <Note margin="14px 0 0">
            Anything above the {inr(cfg.limit)} ceiling should have gone by bank transfer against an
            invoice, so there is a second record of it.
          </Note>
        </>
      ),
    })

  const showUnvouched = () =>
    openModal({
      title: `Paid out with no receipt — ${noReceipt.length}`,
      body: (
        <>
          {noReceipt.length ? (
            <Rows>
              {noReceipt.map((e) => (
                <Row
                  key={e.id}
                  icon={<span className="bad" style={{ fontSize: 'var(--t-lead)' }}>⚑</span>}
                  title={e.what}
                  detail={`${fmtDate(e.d)} · ${e.by}`}
                  right={<span className="mono bad">{inr(e.amt)}</span>}
                />
              ))}
            </Rows>
          ) : (
            <Note size="body" margin={0}>
              Every payment has a voucher against it.
            </Note>
          )}
          <Note margin="14px 0 0">
            Cash paid out without a voucher is the entry an auditor asks about first, and the one
            nobody remembers.
          </Note>
        </>
      ),
    })

  const exportLedger = () => {
    const out = downloadCSV(csvName('petty-cash'), ledgerCsvRows(ledger))
    toast(`${out.name} — ${out.rows.length - 1} rows`)
  }

  const rows = [...ledger].reverse()

  return (
    <>
      <PageHead
        title="Petty cash"
        sub={`${cfg.custodian} holds the box · counted every ${cfg.countEvery}`}
        actions={
          <>
            <Btn variant="ghost" onClick={exportLedger}>
              Export
            </Btn>
            <Btn variant="ghost" onClick={openCount}>
              Count the box
            </Btn>
            <Btn onClick={addEntry}>＋ Entry</Btn>
          </>
        }
      />

      <Kpis>
        <Kpi
          title="In the box, on paper"
          value={
            <span className={balance < cfg.float * LOW ? 'warn' : ''} style={{ fontSize: 'var(--t-h1)' }}>
              {inr(balance)}
            </span>
          }
          tone={balance < cfg.float * LOW ? 'warn' : undefined}
          detail={`float ${inr(cfg.float)}`}
          icon="›"
          hint="How this balance is arrived at"
          onClick={showBalance}
        />
        <Kpi
          title="Spent in 30 days"
          value={<span style={{ fontSize: 'var(--t-h1)' }}>{inr(total(recent))}</span>}
          detail={`${recent.length} payment${recent.length === 1 ? '' : 's'}`}
          icon="›"
          hint="Every payment in the window"
          onClick={showSpent}
        />
        <Kpi
          title="Without a receipt"
          value={<span className={noReceipt.length ? 'bad' : 'ok'}>{noReceipt.length}</span>}
          tone={noReceipt.length ? 'alert' : undefined}
          detail={`${inr(total(noReceipt))} unvouched`}
          icon="›"
          hint="The unvouched payments"
          onClick={showUnvouched}
        />
        <Kpi
          title="Last counted"
          value={<span style={{ fontSize: 'var(--t-h3)' }}>{last ? fmtDate(last.d) : 'never'}</span>}
          tone={due ? 'warn' : undefined}
          detail={
            due ? <span className="warn">a count is due</span> : last ? `by ${last.by}` : undefined
          }
          icon="›"
          hint="Every count of the box"
          onClick={focusCounts}
        />
      </Kpis>

      {due ? (
        <Banner
          kind="r"
          icon="◷"
          title={`Nobody has counted the box for ${last ? daysSince(last.d) : '—'} days`}
          top={16}
          actions={<Btn onClick={openCount}>Count it</Btn>}
        >
          The ledger says {inr(balance)}. Until someone independent has counted it and agreed, that
          is a figure rather than a fact.
        </Banner>
      ) : null}

      {noReceipt.length ? (
        <Banner
          kind="d"
          icon="⚑"
          title={`${noReceipt.length} payment${noReceipt.length === 1 ? '' : 's'} with no receipt — ${inr(total(noReceipt))}`}
          top={14}
        >
          {noReceipt.map((e) => `${e.what} (${e.by}, ${inr(e.amt)})`).join(' · ')}. Cash paid out
          without a voucher is the entry an auditor asks about first, and the one nobody remembers.
        </Banner>
      ) : null}

      {overLimit.length ? (
        <Banner
          kind="r"
          icon="⚠"
          title={`${overLimit.length} payment${overLimit.length === 1 ? '' : 's'} above the ${inr(cfg.limit)} cash ceiling`}
          top={14}
        >
          Anything larger should go through a bank transfer against an invoice, so there is a second
          record of it.
        </Banner>
      ) : null}

      <PettyLedger rows={rows} cfg={cfg} onAdd={addEntry} />

      <div className="two" style={{ marginTop: 18 }}>
        <PettyCounts counts={counts} entries={entries} panelRef={countsPanel} />
        <PettySettings cfg={cfg} />
      </div>
    </>
  )
}

export default function PettyCashRoute() {
  return (
    <RequireCap cap="pricing">
      <ErrorBoundary what="Petty cash">
        <PettyCash />
      </ErrorBoundary>
    </RequireCap>
  )
}
