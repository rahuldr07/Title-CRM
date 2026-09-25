import { afterEach, describe, expect, it } from 'vitest'
import { addPrefix, clashOf, removePrefix, resetPrefixes } from './prefixes'

const BOSS = { id: 'hw', r: 'admin' }

afterEach(() => {
  resetPrefixes()
})

describe('claiming an order-number prefix', () => {
  it('refuses one that is already claimed', () => {
    expect(clashOf('MGRMI-')).not.toBeNull()
  })

  it('refuses one that merely overlaps, in either direction', () => {
    expect(clashOf('MGRMI'), 'shorter than an existing one').not.toBeNull()
    expect(clashOf('MGRMI-2024'), 'longer than an existing one').not.toBeNull()
  })

  it('allows one that shares no leading run', () => {
    expect(clashOf('ZZTOP-')).toBeNull()
  })

  it('sees clients nobody has opened', () => {
    expect(clashOf('MJPA-')).not.toBeNull()
    expect(clashOf('NTCFL-')).not.toBeNull()
  })

  it('adds and removes', () => {
    expect(clashOf('ZZTOP-')).toBeNull()
    addPrefix(BOSS, 'MGR', 'ZZTOP-')
    expect(clashOf('ZZTOP-')).toEqual(['MGR', 'ZZTOP-'])
    removePrefix(BOSS, 'MGR', 'ZZTOP-')
    expect(clashOf('ZZTOP-')).toBeNull()
  })

  it('puts the seed back on reset', () => {
    addPrefix(BOSS, 'MGR', 'ZZTOP-')
    resetPrefixes()
    expect(clashOf('ZZTOP-')).toBeNull()
  })
})

describe('who may change a prefix', () => {
  it('refuses someone without “pricing”', () => {
    expect(addPrefix({ id: 'sk', r: 'lead' }, 'MGR', 'ZZTOP-')).toMatch(/“pricing”/)
    expect(removePrefix({ id: 'sk', r: 'lead' }, 'MGR', 'ZZTOP-')).toMatch(/“pricing”/)
  })
})
