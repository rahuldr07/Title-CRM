export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const isEmail = (v: string): boolean => EMAIL.test(v.trim())

export const EMAIL_ERROR = 'That email does not look right.'

export function isDuplicateName<T>(
  existing: readonly T[],
  candidate: string,
  nameOf: (item: T) => string,
  isSameRecord: (item: T) => boolean = () => false,
): boolean {
  const wanted = candidate.trim().toLowerCase()
  return existing.some((item) => !isSameRecord(item) && nameOf(item).toLowerCase() === wanted)
}

/* A salary sent to a bad account bounces, so bank details are checked in the
   bank's own form, and all-zero or XXXX placeholders — which the redacted seed
   carries for everyone — count as not on file. */
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/
const ACCOUNT = /^\d{9,18}$/

export function bankProblem(bank: { acct?: string; ifsc?: string } | undefined): string | null {
  const acct = bank?.acct?.trim() ?? ''
  const ifsc = bank?.ifsc?.trim().toUpperCase() ?? ''
  if (!acct) return 'No account number on file'
  if (!ACCOUNT.test(acct)) return 'Account number is not 9 to 18 digits'
  if (/^0+$/.test(acct)) return 'Account number is a placeholder'
  if (!IFSC.test(ifsc)) return 'IFSC is not four letters, a zero and six more'
  if (ifsc.startsWith('XXXX')) return 'IFSC is a placeholder'
  return null
}

const IDS = {
  pan: [/^[A-Z]{5}\d{4}[A-Z]$/, 'PAN is five letters, four digits and a letter'],
  uan: [/^\d{12}$/, 'UAN is 12 digits'],
  aadhaar: [/^[2-9]\d{3}\s?\d{4}\s?\d{4}$/, 'Aadhaar is 12 digits and does not start with 0 or 1'],
} as const satisfies Record<string, readonly [RegExp, string]>

/** Empty is allowed — the number can be collected later — but a number given must be well formed. */
export function idProblem(kind: keyof typeof IDS, value: string): string | null {
  const v = value.trim().toUpperCase()
  if (!v) return null
  const [pattern, message] = IDS[kind]
  return pattern.test(v) ? null : message
}
