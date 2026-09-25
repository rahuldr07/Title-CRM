import { describe, expect, it } from 'vitest'
import { thinDepts } from './alerts'
import { currentDepts, saveDept } from '@/domain/company/departments'

describe('departments with nobody free', () => {
  it('counts a department added on screen', () => {
    saveDept({ id: 'hw', r: 'admin' }, { n: 'Probate', desc: '', auto: false, pair: null, qc: false })
    expect(currentDepts().some((d) => d.n === 'Probate')).toBe(true)
    expect(thinDepts().map((d) => d.n)).toContain('Probate')
  })
})
