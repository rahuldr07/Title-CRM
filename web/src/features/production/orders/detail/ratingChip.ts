import { scoreBand } from '@/domain/quality/quality'
import { ratingAverage, type StageRating } from '@/domain/orders/orders'
import type { ChipKind } from '@/data/types'

export function ratingChip(r: StageRating | undefined): { text: string; kind: ChipKind } {
  if (!r) return { text: 'Rated', kind: 'n' }
  const avg = ratingAverage(r)
  const band = scoreBand(avg)
  return { text: `${avg.toFixed(1)} · ${band.label}`, kind: band.chip }
}
