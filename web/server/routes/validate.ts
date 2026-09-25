export type Read<T> = { ok: true; value: T } | { ok: false; error: string }

const asObject = (body: unknown): Record<string, unknown> | null =>
  body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null

export function readAssignee(body: unknown): Read<{ assigneeId: string | null }> {
  const b = asObject(body)
  if (!b) return { ok: false, error: 'Expected an object' }
  const value = b.assigneeId
  if (value === null || value === undefined) return { ok: true, value: { assigneeId: null } }
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, error: 'assigneeId must be a person id or null' }
  }
  return { ok: true, value: { assigneeId: value } }
}

export type Decision = 'approved' | 'rejected'

export function readDecision(body: unknown): Read<Decision> {
  const b = asObject(body)
  const status = b?.status
  if (status !== 'approved' && status !== 'rejected') {
    return { ok: false, error: 'A decision is either approved or rejected' }
  }
  return { ok: true, value: status }
}

export interface LoanRequestInput {
  kind: 'loan' | 'advance'
  amount: number
  emi: number
  note: string
}

export function readLoanRequest(body: unknown): Read<LoanRequestInput> {
  const b = asObject(body)
  if (!b) return { ok: false, error: 'Expected an object' }
  if (b.kind !== 'loan' && b.kind !== 'advance') {
    return { ok: false, error: 'kind must be loan or advance' }
  }
  const amount = Number(b.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'amount must be a positive number' }
  }
  const emi = Number(b.emi)
  if (!Number.isFinite(emi) || emi <= 0) {
    return { ok: false, error: 'emi must be a positive number' }
  }
  if (emi > amount) {
    return { ok: false, error: 'emi cannot be more than the amount itself' }
  }
  const note = typeof b.note === 'string' ? b.note.trim() : ''
  if (!note) return { ok: false, error: 'Say what it is for' }
  return { ok: true, value: { kind: b.kind, amount, emi, note } }
}

export function readEnabled(body: unknown): Read<boolean> {
  const b = asObject(body)
  if (typeof b?.enabled !== 'boolean') {
    return { ok: false, error: 'enabled must be true or false' }
  }
  return { ok: true, value: b.enabled }
}

const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY'] as const

export interface SettingsPatch {
  dateFormat?: string
  slaBufferPct?: number
  onTimeTarget?: number
}

export function readSettings(body: unknown): Read<SettingsPatch> {
  const b = asObject(body)
  if (!b) return { ok: false, error: 'Expected an object of settings' }
  const patch: SettingsPatch = {}

  if (b.dateFormat !== undefined) {
    if (typeof b.dateFormat !== 'string' || !DATE_FORMATS.includes(b.dateFormat as never)) {
      return { ok: false, error: `dateFormat must be one of ${DATE_FORMATS.join(' or ')}` }
    }
    patch.dateFormat = b.dateFormat
  }
  if (b.slaBufferPct !== undefined) {
    const n = Number(b.slaBufferPct)
    if (!Number.isFinite(n) || n < 0 || n >= 100) {
      return { ok: false, error: 'The buffer is a percentage of the promise, so it must be under 100' }
    }
    patch.slaBufferPct = n
  }
  if (b.onTimeTarget !== undefined) {
    const n = Number(b.onTimeTarget)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { ok: false, error: 'The on-time target is a percentage, so it must be between 0 and 100' }
    }
    patch.onTimeTarget = n
  }

  if (!Object.keys(patch).length) return { ok: false, error: 'No settings to change' }
  return { ok: true, value: patch }
}
