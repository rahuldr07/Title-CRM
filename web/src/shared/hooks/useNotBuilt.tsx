import { Btn } from '@/shared/ui/Button'
import { useUi } from '@/shared/ui/UiProvider'
import type { CsvResult } from '@/shared/lib/csv'

export function useNotBuilt() {
  const { openModal, closeModal, toast } = useUi()

  return (what: string, needs: string, csv?: () => CsvResult) =>
    openModal({
      title: `${what} is not available yet`,
      body: (
        <>
          <p style={{ fontSize: 'var(--t-body)' }}>
            It needs <b>{needs}</b>, which is not connected yet.
          </p>
          <p className="gr" style={{ fontSize: 'var(--t-small)' }}>
            {csv
              ? 'CSV carries the same fields and is working now — every value on this screen. Everything around this action is real; what is missing is the part that has to reach outside the workspace.'
              : 'Everything around it is real — the screen knows what the action means and where its result would go. What is missing is the part that has to reach outside this workspace.'}
          </p>
        </>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Close
          </Btn>
          {csv ? (
            <Btn
              onClick={() => {
                closeModal()
                const out = csv()
                toast(`${out.name} — ${out.rows.length - 1} rows`)
              }}
            >
              Export CSV instead
            </Btn>
          ) : null}
        </>
      ),
    })
}
