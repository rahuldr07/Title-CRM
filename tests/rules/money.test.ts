import { describe, expect, it } from 'vitest'
import { money } from '@/lib/format'
import { inr, inr2 } from '@/lib/payroll'

/**
 * A figure is one unbreakable thing.
 *
 * Negative amounts printed as "₹-1,234.00", and a line may break after a hyphen,
 * so on a phone the payslip showed a minus sign on one line and its number on
 * the next. The sign goes in front of the currency, as a true minus (U+2212),
 * which the line-breaking rules keep attached to what follows.
 */
describe('a negative amount', () => {
  it('puts a true minus in front of the rupee sign', () => {
    expect(inr(-1234)).toBe('−₹1,234')
    expect(inr2(-1234.5)).toBe('−₹1,234.50')
  })

  it('puts a true minus in front of the dollar sign', () => {
    expect(money(-12.5)).toBe('−$12.50')
  })

  it('carries no hyphen a line could break after', () => {
    for (const s of [inr(-5), inr2(-5), money(-5)]) expect(s).not.toContain('-')
  })
})

describe('a positive amount', () => {
  it('is unchanged', () => {
    expect(inr(876006)).toBe('₹8,76,006')
    expect(money(126194.6)).toBe('$126,194.60')
  })
})
