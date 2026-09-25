import { describe, expect, it } from 'vitest'
import { nextId } from './ids'

describe('the next id under a prefix', () => {
  it('starts at one when nothing has that prefix yet', () => {
    expect(nextId('d', ['search', 'sqc', 'typing'])).toBe('d1')
    expect(nextId('J', [])).toBe('J1')
  })

  it('is one past the highest number used, and never hands a removed id out again', () => {
    expect(nextId('L', ['L1', 'L8', 'E3'])).toBe('L9')
    expect(nextId('r', ['r1', 'r3'])).toBe('r4')
  })

  it('reads only ids under its own prefix', () => {
    expect(nextId('PM', ['PM2', 'P7'])).toBe('PM3')
    expect(nextId('P', ['PM9', 'P2'])).toBe('P3')
  })
})
