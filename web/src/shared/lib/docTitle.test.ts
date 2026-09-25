import { afterEach, describe, expect, it } from 'vitest'
import { APP_NAME, docTitle, setTitlePart } from './docTitle'

describe('docTitle', () => {
  it('reads page, workspace, app — most specific first', () => {
    expect(docTitle({ page: 'Orders', workspace: 'Firstkey Title' })).toBe('Orders · Firstkey Title · Title CRM')
  })

  it('puts the open tab ahead of the page it belongs to', () => {
    expect(docTitle({ page: 'Reports', tab: 'Turnaround', workspace: 'Acme' })).toBe('Turnaround · Reports · Acme · Title CRM')
  })

  it('drops a tab that only repeats the page name, and any part not known yet', () => {
    expect(docTitle({ page: 'Company', tab: 'Company', workspace: 'Acme' })).toBe('Company · Acme · Title CRM')
    expect(docTitle({ page: 'Sign in' })).toBe(`Sign in · ${APP_NAME}`)
    expect(docTitle({})).toBe(APP_NAME)
  })
})

describe('setTitlePart', () => {
  afterEach(() => {
    setTitlePart('page', undefined)
    setTitlePart('tab', undefined)
    setTitlePart('workspace', undefined)
  })

  it('keeps the other parts when one of them changes', () => {
    setTitlePart('workspace', 'Acme')
    setTitlePart('page', 'Payroll')
    expect(setTitlePart('tab', 'Register')).toBe('Register · Payroll · Acme · Title CRM')
    expect(setTitlePart('page', 'Leave')).toBe('Register · Leave · Acme · Title CRM')
    expect(setTitlePart('tab', undefined)).toBe('Leave · Acme · Title CRM')
  })
})
