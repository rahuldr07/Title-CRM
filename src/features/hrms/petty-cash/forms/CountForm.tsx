import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Form, FormActions } from '@/shared/ui/Form'
import type { PettyCount } from '@/data/types'
import { inr } from '@/domain/company/money'
import { now } from '@/shared/lib/clock'
import { Note } from '@/shared/ui/Layout'
import { Input } from '@/shared/ui/Controls'

export function CountForm({
  expected,
  countedBy,
  onSubmit,
  onCancel,
}: {
  expected: number
  countedBy: string
  onSubmit: (count: Omit<PettyCount, 'id'>) => void
  onCancel: () => void
}) {
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')

  const value = Number(counted)
  const entered = counted.trim() !== '' && Number.isFinite(value)
  const drift = value - expected

  const submit = () => {
    if (!entered || value < 0) return
    onSubmit({
      d: now(),
      by: countedBy,
      counted: value,
      note: note.trim() || (drift === 0 ? 'Matched.' : 'Difference not yet explained.'),
    })
  }

  return (
    <Form onSubmit={submit}>
      <Note plain size="body">
        Count the cash physically, then type what is actually there.{' '}
        <b>Do not look at the ledger figure first</b> — a count that starts from the expected number
        is not a count.
      </Note>

      <Field label="Counted">
        <Input
          field
          mono
          id="ct-a"
          type="number"
          min={0}
          placeholder="0"
          autoComplete="off"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
        />
      </Field>

      <Field label="Note">
        <Input
          field
          id="ct-n"
          placeholder="Anything worth recording"
          autoComplete="off"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {entered ? (
        drift === 0 ? (
          <Banner kind="v" icon="✓" margin={0}>
            Matches the ledger exactly at {inr(expected)}.
          </Banner>
        ) : (
          <Banner kind="d" icon="⚑" margin={0}>
            <b>
              {drift > 0 ? 'Over' : 'Short'} by {inr(Math.abs(drift))}
            </b>{' '}
            — the ledger says {inr(expected)}, you counted {inr(value)}. Record it as counted.
            Correcting the count to match the book is how a discrepancy becomes permanent.
          </Banner>
        )
      ) : null}

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit disabled={!entered || value < 0}>
          Record the count
        </Btn>
      </FormActions>
    </Form>
  )
}
