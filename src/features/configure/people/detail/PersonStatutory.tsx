import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { DetailRow } from '@/shared/ui/DetailList'
import type { Person } from '@/data/types'
import { maskAadhaar, STATUTORY_WITHHELD } from './personDetail'
import { Note } from '@/shared/ui/Layout'

export function PersonStatutory({
  person,
  maySeePersonal,
  aadhaarShown,
  onShowAadhaar,
}: {
  person: Person
  maySeePersonal: boolean
  aadhaarShown: boolean
  onShowAadhaar: () => void
}) {
  return (
    <Card padded>
      <Label>Statutory</Label>
      {maySeePersonal ? (
        <>
          {(
            [
              ['PAN', person.pan],
              ['UAN — provident fund', person.uan],
              ['ESIC number', person.esicNo],
            ] as [string, string][]
          ).map((r) => (
            <DetailRow
              key={r[0]}
              gap={14}
              label={r[0]}
              value={
                r[1] ? <span className="mono">{r[1]}</span> : <span className="bad">not on record</span>
              }
            />
          ))}
          <DetailRow
            gap={14}
            center
            label="Aadhaar"
            value={
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <b className="mono">
                  {person.aadhaar
                    ? aadhaarShown
                      ? person.aadhaar
                      : maskAadhaar(person.aadhaar)
                    : 'not on record'}
                </b>
                {person.aadhaar && !aadhaarShown ? (
                  <Btn variant="ghost" small onClick={onShowAadhaar}>
                    Show
                  </Btn>
                ) : null}
              </span>
            }
          />
          <DetailRow
            gap={14}
            label="Bank"
            last
            value={
              person.bank?.acct ? (
                <span className="mono">
                  {person.bank.acct} · {person.bank.ifsc}
                </span>
              ) : (
                <span className="bad">not on record</span>
              )
            }
          />
          <Note top={10}>
            Aadhaar shows its last four by default. Anything more should be a deliberate act, and
            in a real deployment a logged one.
          </Note>
        </>
      ) : (
        <Note margin="10px 0 0">
          {STATUTORY_WITHHELD}
        </Note>
      )}
    </Card>
  )
}
