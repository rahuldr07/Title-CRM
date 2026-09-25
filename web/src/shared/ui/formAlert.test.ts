import { describe, expect, it } from 'vitest'
import { faultIdFor, faulted } from './formAlert'

describe('faulted', () => {
  it('counts every failed submit, so the same message moves focus again', () => {
    const first = faulted(null, 'A company name is required.', 'co')
    const again = faulted(first, 'A company name is required.', 'co')
    expect(first.n).toBe(1)
    expect(again.n).toBe(2)
    expect(again).toMatchObject({ message: 'A company name is required.', field: 'co' })
  })

  it('carries no field when the refusal is about the whole form', () => {
    expect(faulted(null, 'Refused by the server.').field).toBeUndefined()
  })
})

describe('faultIdFor', () => {
  it('points only the offending field at the alert', () => {
    const fault = faulted(null, 'Give an email.', 'email')
    expect(faultIdFor(fault, 'alert-1', 'email')).toBe('alert-1')
    expect(faultIdFor(fault, 'alert-1', 'name')).toBeUndefined()
    expect(faultIdFor(null, 'alert-1', 'email')).toBeUndefined()
  })
})
