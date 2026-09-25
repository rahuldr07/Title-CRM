import { describe, expect, it } from 'vitest'
import { applyDateFormat, fmtUsDate, iso, listOf, money, parseDate, usDate, webHref } from './format'

describe('a county address as a link', () => {
  it('opens over https when stored without a scheme', () => {
    expect(webHref('cambriacountypa-web.tylerhost.net/web/search')).toBe(
      'https://cambriacountypa-web.tylerhost.net/web/search',
    )
  })

  it('keeps a scheme it was given', () => {
    expect(webHref('http://example.gov/x')).toBe('http://example.gov/x')
    expect(webHref('https://example.gov')).toBe('https://example.gov')
  })

  it('is not a link when nothing is on file', () => {
    expect(webHref('')).toBeNull()
    expect(webHref('   ')).toBeNull()
  })

  it('refuses any scheme that is not the web', () => {
    expect(webHref('javascript:alert(1)')).toBeNull()
    expect(webHref('data:text/html,hi')).toBeNull()
    expect(webHref('JAVASCRIPT:alert(1)')).toBeNull()
  })

  it('refuses text that is not an address', () => {
    expect(webHref('call the recorder')).toBeNull()
  })
})

describe('a negative dollar amount', () => {
  it('puts a true minus in front of the dollar sign', () => {
    expect(money(-12.5)).toBe('−$12.50')
  })

  it('carries no hyphen a line could break after', () => {
    expect(money(-5)).not.toContain('-')
  })
})

describe('a positive dollar amount', () => {
  it('is unchanged', () => {
    expect(money(126194.6)).toBe('$126,194.60')
  })
})

describe('listOf', () => {
  it('joins one or two names with "and"', () => {
    expect(listOf([])).toBe('')
    expect(listOf(['Accuracy'])).toBe('Accuracy')
    expect(listOf(['Accuracy', 'Formatting'])).toBe('Accuracy and Formatting')
  })

  it('puts commas between the rest', () => {
    expect(listOf(['Accuracy', 'Completeness', 'Formatting'])).toBe('Accuracy, Completeness and Formatting')
  })
})

describe('a date the seed stores as MM/DD/YYYY', () => {
  it('prints in the company’s format and leaves anything that is not a date alone', () => {
    applyDateFormat('DD/MM/YYYY')
    expect(fmtUsDate('08/15/2026')).toBe('15/08/2026')
    expect(fmtUsDate('Mar 2026')).toBe('Mar 2026')
    expect(fmtUsDate('')).toBe('')
    applyDateFormat('MM/DD/YYYY')
    expect(fmtUsDate('08/15/2026')).toBe('08/15/2026')
  })

  it('is written back in that one stored form whatever the screen shows', () => {
    expect(usDate(new Date(2026, 7, 15))).toBe('08/15/2026')
  })
})

describe('a date typed on a form', () => {
  it('is read in the company’s format', () => {
    applyDateFormat('DD/MM/YYYY')
    expect(iso(parseDate('10/08/2026'))).toBe('2026-08-10')
    applyDateFormat('MM/DD/YYYY')
    expect(iso(parseDate('10/08/2026'))).toBe('2026-10-08')
  })

  it('is not a date when the day or month cannot exist', () => {
    applyDateFormat('MM/DD/YYYY')
    expect(Number.isNaN(parseDate('15/08/2026').getTime())).toBe(true)
    expect(Number.isNaN(parseDate('02/30/2026').getTime())).toBe(true)
    expect(Number.isNaN(parseDate('next Tuesday').getTime())).toBe(true)
  })
})
