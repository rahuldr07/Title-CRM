import type { ReactNode } from 'react'
import { dueMeta } from '@/domain/orders/orderState'
import type { ChipKind } from '@/data/types'

export function Chip({ children, kind = 'n', plain }: { children: ReactNode; kind?: ChipKind; plain?: boolean }) {
  return <span className={`chip ${kind}${plain ? ' pl' : ''}`}>{children}</span>
}

export function Due({ at, sent }: { at: Date; sent?: Date | null | undefined }) {
  const { kind, abs, rel } = dueMeta(at, sent)
  return (
    <span className={`due ${kind}`}>
      {abs}
      <span className="sub">{rel}</span>
    </span>
  )
}
