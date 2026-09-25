import { currentStaff } from '@/domain/people/roster'
import { DEMO_IDENTITY } from '@/shared/lib/demo'
import { checkCredentials, type CredentialCheck } from './credentials'

const KEY = 'titlecrm.seed-session'

export const signInOnSeed = (email: string, password: string): CredentialCheck =>
  checkCredentials(email, password, { passwordChecked: !DEMO_IDENTITY })

const store = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

let inMemory: string | null = null

export function readSession(): string | null {
  if (!DEMO_IDENTITY) return null
  const id = store()?.getItem(KEY) ?? inMemory
  return id && currentStaff().some((s) => s.id === id) ? id : null
}

export function startSession(personId: string): void {
  if (!DEMO_IDENTITY) return
  inMemory = personId
  store()?.setItem(KEY, personId)
}

export function endSession(): void {
  inMemory = null
  store()?.removeItem(KEY)
}
