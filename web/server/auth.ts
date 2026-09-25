import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db/client'
import { account, session, user, verification } from './db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    additionalFields: {
      activeTenantId: { type: 'string', required: false, input: false },
    },
  },
  trustedOrigins: [process.env.APP_URL ?? 'http://localhost:5173'],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.API_URL ?? 'http://localhost:8787',
})

export function assertAuthSecretIsSet(): void {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'BETTER_AUTH_SECRET is missing or shorter than 32 characters. Sessions cannot ' +
        'be signed safely without it. Generate one with: openssl rand -base64 32',
    )
  }
}
