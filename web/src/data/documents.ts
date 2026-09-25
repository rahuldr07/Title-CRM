export interface OrderDoc {
  id: string
  kind: string
  recorded: string
  bookPage: string
  instrument: string
  image: boolean
  extraction: 'verified' | 'review' | 'none'
}

export const SEED_DOCS: OrderDoc[] = [
  { id: 'd1', kind: 'Mortgage', recorded: '12/17/2025', bookPage: '736/935', instrument: '2025-002688', image: true, extraction: 'verified' },
  { id: 'd2', kind: 'Administrator’s Deed', recorded: '12/17/2025', bookPage: '736/932', instrument: '2025-002687', image: true, extraction: 'verified' },
  { id: 'd3', kind: 'Scrivener’s Affidavit', recorded: '01/14/2026', bookPage: '738/76', instrument: '2026-000096', image: true, extraction: 'review' },
]
