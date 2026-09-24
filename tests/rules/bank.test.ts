import { describe, expect, it } from 'vitest'
import { bankProblem, idProblem } from '@/lib/forms'

/**
 * Bank and statutory details, checked before money is sent against them.
 *
 * The staff form took account "12", IFSC "bad" and PAN "123", and the bank file
 * went out with placeholder accounts for every person and no warning. A salary
 * sent to a bad account bounces, so a bad or placeholder account is a reason a
 * person cannot be paid yet, not a detail to find out later.
 */
describe('a bank account', () => {
  const good = { acct: '50100234567812', ifsc: 'HDFC0000123' }

  it('passes in the bank’s own form', () => {
    expect(bankProblem(good)).toBeNull()
    expect(bankProblem({ ...good, ifsc: 'hdfc0000123' })).toBeNull()
  })

  it('is missing when nothing is on file', () => {
    expect(bankProblem(undefined)).toMatch(/no account/i)
    expect(bankProblem({ acct: '', ifsc: '' })).toMatch(/no account/i)
  })

  it('needs 9 to 18 digits', () => {
    expect(bankProblem({ ...good, acct: '12' })).toMatch(/9 to 18 digits/)
    expect(bankProblem({ ...good, acct: '1234-5678-90' })).toMatch(/9 to 18 digits/)
  })

  it('needs an IFSC of four letters, a zero and six more', () => {
    expect(bankProblem({ ...good, ifsc: 'bad' })).toMatch(/IFSC/)
    expect(bankProblem({ ...good, ifsc: 'HDFC1000123' })).toMatch(/IFSC/)
    expect(bankProblem({ ...good, ifsc: '' })).toMatch(/IFSC/)
  })

  it('is not an all-zero placeholder', () => {
    expect(bankProblem({ acct: '00000000000', ifsc: 'HDFC0000123' })).toMatch(/placeholder/)
    expect(bankProblem({ acct: '50100234567812', ifsc: 'XXXX0000000' })).toMatch(/placeholder/)
  })
})

describe('statutory numbers', () => {
  it('accepts a PAN in its form and refuses anything else', () => {
    expect(idProblem('pan', 'ABCPS1234D')).toBeNull()
    expect(idProblem('pan', '123')).toMatch(/PAN/)
  })

  it('needs a 12-digit UAN', () => {
    expect(idProblem('uan', '100123456789')).toBeNull()
    expect(idProblem('uan', '12345')).toMatch(/UAN/)
  })

  it('needs a 12-digit Aadhaar that does not start with 0 or 1', () => {
    expect(idProblem('aadhaar', '2345 6789 0123')).toBeNull()
    expect(idProblem('aadhaar', '234567890123')).toBeNull()
    expect(idProblem('aadhaar', '0123 4567 8901')).toMatch(/Aadhaar/)
  })

  it('leaves an empty field to be collected later', () => {
    expect(idProblem('pan', '')).toBeNull()
    expect(idProblem('uan', '  ')).toBeNull()
  })
})
