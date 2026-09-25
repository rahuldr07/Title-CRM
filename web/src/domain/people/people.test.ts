import { describe, expect, it } from 'vitest'
import type { Person } from '@/data/types'
import { EMAIL_ERROR } from '@/shared/lib/forms'
import { bankFor, newPerson, staffProblem, suggestedEmail } from './people'

const person = (over: Partial<Person>): Person => ({ ...newPerson(), ...over })
const uma = person({ id: 'us', n: 'Uma Sankar', e: 'uma.sankar@keystoneabstract.com', bank: { acct: '12', ifsc: 'bad', name: 'Uma Sankar' }, pan: 'bad' })
const ravi = person({ id: 'rm', n: 'Ravi M', e: 'ravi.m@keystoneabstract.com' })
const staff = [uma, ravi]
const form = { name: 'Uma Sankar', mail: 'uma.sankar@keystoneabstract.com', acct: '12', ifsc: 'bad', pan: 'bad', uan: '', aadhaar: '' }

describe('the email a new person is offered', () => {
  it('is their name, dotted, at the company domain', () => {
    expect(suggestedEmail('Meera Nair')).toBe('meera.nair@keystoneabstract.com')
  })

  it('is blank until a name is typed', () => {
    expect(suggestedEmail(undefined)).toBe('')
  })
})

describe('a staff record that cannot be saved', () => {
  it('needs a name', () => {
    expect(staffProblem({ ...form, name: '' }, staff, 'us', uma)).toBe('A name is required.')
  })

  it('needs an email that looks like one', () => {
    expect(staffProblem({ ...form, mail: 'bad' }, staff, 'us', uma)).toBe(EMAIL_ERROR)
  })

  it('cannot take an email someone else holds', () => {
    expect(staffProblem({ ...form, mail: 'ravi.m@keystoneabstract.com' }, staff, 'us', uma)).toBe(
      'ravi.m@keystoneabstract.com already belongs to someone here.',
    )
  })

  it('refuses a changed bank account the salary would bounce from', () => {
    expect(staffProblem({ ...form, acct: '34' }, staff, 'us', uma)).toBe(
      'Account number is not 9 to 18 digits. A salary sent to it would bounce.',
    )
  })

  it('refuses a changed identifier in the wrong shape', () => {
    expect(staffProblem({ ...form, pan: 'X1' }, staff, 'us', uma)).toBe(
      'PAN is five letters, four digits and a letter.',
    )
  })

  it('leaves alone what was already on file, even when it is wrong', () => {
    expect(staffProblem(form, staff, 'us', uma)).toBeNull()
  })

  it('lets a cleared bank account through', () => {
    expect(staffProblem({ ...form, acct: '', ifsc: '' }, staff, 'us', uma)).toBeNull()
  })

  it('checks everything typed for someone new', () => {
    expect(staffProblem({ ...form, mail: 'new@keystoneabstract.com', acct: '', ifsc: '' }, staff, undefined, undefined)).toBe(
      'PAN is five letters, four digits and a letter.',
    )
  })
})

describe('the bank details saved with a person', () => {
  it('name the person as they are saved now, not as they were', () => {
    const was = { name: 'Uma Shankar', acct: '123456789012', ifsc: 'HDFC0001234' }
    expect(bankFor('Uma Sen', ' 123456789012 ', 'HDFC0001234 ', was)).toEqual({
      name: 'Uma Sen',
      acct: '123456789012',
      ifsc: 'HDFC0001234',
    })
  })

  it('name a new person with nothing on file', () => {
    expect(bankFor('Nia Brooks', '', '')).toEqual({ name: 'Nia Brooks', acct: '', ifsc: '' })
  })
})
