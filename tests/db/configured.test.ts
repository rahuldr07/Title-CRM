import { describe, expect, it } from 'vitest'

describe.skipIf(!process.env.CI)('CI', () => {
  it('has a database, so nothing in tests/db can skip itself', () => {
    for (const name of ['DATABASE_URL', 'APP_DATABASE_URL', 'BETTER_AUTH_SECRET']) {
      expect(process.env[name], `${name} is unset — tests/db would skip silently`).toBeTruthy()
    }
  })
})
