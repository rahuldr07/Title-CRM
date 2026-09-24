import { describe, expect, it } from 'vitest'
import { countyName, webHref } from '@/lib/format'

/**
 * A county link, made clickable.
 *
 * Recorder and tax addresses were plain text, so a searcher copied and pasted
 * them dozens of times a shift. They are stored without a scheme, and they are
 * editable on the county screen — so an address becomes a link only when it is
 * a web address, and never whatever else someone typed.
 */
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

/*
 * Alaska records by recording district and Louisiana by parish, so "Palmer
 * County, AK" names a place that does not exist.
 */
describe('a county’s name', () => {
  it('is a county in most states', () => {
    expect(countyName('Cambria', 'PA')).toBe('Cambria County')
  })

  it('is a recording district in Alaska', () => {
    expect(countyName('Palmer', 'AK')).toBe('Palmer Recording District')
  })

  it('is a parish in Louisiana', () => {
    expect(countyName('Orleans', 'LA')).toBe('Orleans Parish')
  })
})
