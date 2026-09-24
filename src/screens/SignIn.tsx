import { useState, type FormEvent } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useGo } from '@/lib/nav'
import { useQueryClient } from '@tanstack/react-query'
import { Banner } from '@/components/ui'
import { useSession } from '@/state/session'
import { useUi } from '@/state/ui'
import { STAFF } from '@/data/people'
import { COMPANY_GLYPH, COMPANY_NAME, LOGO_HEIGHT, LOGO_URL } from '@/data/brand'
import { initials } from '@/lib/format'
import { can as capabilityOf, mayVisit, roleName } from '@/lib/permissions'
import { DEMO_IDENTITY } from '@/lib/demo'
import { ADMIN_EMAIL, checkCredentials } from '@/lib/credentials'
import { ApiError, startSession } from '@/lib/api'
import {
  ArrowIcon,
  BoltIcon,
  EyeIcon,
  LockIcon,
  MailIcon,
  MicrosoftMark,
  ReportIcon,
  SearchIcon,
  ShieldIcon,
  Street,
} from './signin/art'

const handled =
  <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
  (...args: A): void => {
    fn(...args).catch((error: unknown) => {
      console.error('Sign-in:', error)
    })
  }

const FEATURES = [
  [SearchIcon, 'Title Searches', 'Accurate and reliable results'],
  [ReportIcon, 'Property Reports', 'Detailed, comprehensive, on time'],
  [BoltIcon, 'Electronic Ordering', 'Fast, secure, and easy'],
  [ShieldIcon, 'Quality Control', 'Built on accuracy and trust'],
] as const

/* Neither of these has anything behind it yet — no mail is sent from this
   application, and no Microsoft tenant is registered with Better Auth — so
   each says so where it was asked, rather than doing nothing. */
const NOTES = {
  forgot: `Password reset by email is not set up yet. Ask your ${COMPANY_NAME} administrator for a new password.`,
  microsoft: 'Microsoft sign-in is not switched on for this workspace yet. Use your work email and password.',
} as const

/* The logo file is a 200px square that is mostly white, with the mark in a
   band across its middle. `crop` shows that band at the given width, so the
   mark reads at the size the page gives it rather than a third of it. */
function Mark({ height, crop }: { height: number; crop?: number }) {
  const [broken, setBroken] = useState(false)
  if (LOGO_URL && !broken && crop) {
    return (
      <span className="si-logo-crop" style={{ width: crop, height }}>
        <img className="si-logo" src={LOGO_URL} alt={COMPANY_NAME} onError={() => setBroken(true)} />
      </span>
    )
  }
  return LOGO_URL && !broken ? (
    <img
      className="si-logo"
      src={LOGO_URL}
      alt={COMPANY_NAME}
      height={height}
      style={{ height, width: 'auto', maxWidth: '100%' }}
      onError={() => setBroken(true)}
    />
  ) : (
    <div className="si-wordmark">
      <span aria-hidden="true">{COMPANY_GLYPH}</span> {COMPANY_NAME}
    </div>
  )
}

export default function SignIn() {
  const { me, authState, signInAs, signOut, can } = useSession()
  const { toast } = useUi()
  const navigate = useGo()
  const queryClient = useQueryClient()
  const next = useRouterState({
    select: (s) => (s.location.search as { next?: string }).next,
  })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [note, setNote] = useState<keyof typeof NOTES | null>(null)
  const [leaving, setLeaving] = useState(false)

  const landing = (personId: string) => {
    const person = STAFF.find((s) => s.id === personId)
    const wanted = next?.split('/').filter(Boolean)[0]
    if (next && wanted && mayVisit(person, wanted)) return next
    return capabilityOf(person, 'all') ? '/dash' : '/mywork'
  }

  const noServiceBehind = (e: unknown) =>
    !(e instanceof ApiError) || e.status === 404 || e.status === 0 || e.status >= 500

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNote(null)
    setBusy(true)
    try {
      await startSession(email, password, remember)
      await queryClient.resetQueries()
      navigate({ to: next ?? '/dash', replace: true })
    } catch (err) {
      if (!noServiceBehind(err)) {
        setError(err instanceof ApiError ? err.message : 'That email and password did not match.')
        setBusy(false)
        return
      }

      if (!DEMO_IDENTITY) {
        setError('This build signs in against the database. The sign-in service is not reachable.')
        setBusy(false)
        return
      }

      const check = checkCredentials(email, password, { passwordChecked: false })
      if (!check.ok) {
        setError(check.error)
        setBusy(false)
        return
      }
      signInAs(check.person.id)
      toast(`Signed in as ${check.person.n} — ${roleName(check.person.r)}`)
      navigate({ to: landing(check.person.id), replace: true })
    } finally {
      setBusy(false)
    }
  }

  /* Both sign-out controls — the sidebar's ⏻ and the account chip — lead here
     while you are still signed in, so this card is the sign-out screen, and
     it wears the sign-in page's street so leaving looks like where you came in. */
  if (authState !== 'anonymous') {
    return (
      <div className="so">
        <div className="so-art" aria-hidden="true">
          <Street />
          <div className="si-slant" />
        </div>
        <div className="so-body">
          <div className="si-card-mark">
            <Mark height={LOGO_HEIGHT + 28} crop={200} />
          </div>
          <h2 className="so-title">Ready to sign out?</h2>
          <div className="so-who">
            <span className="si-tile" aria-hidden="true">
              {initials(me.n)}
            </span>
            <span style={{ minWidth: 0 }}>
              <b>{me.n}</b>
              <span>
                {roleName(me.r)} · {me.dep.join(', ') || 'No department'}
              </span>
            </span>
          </div>
          <p className="so-can">
            You {can('all') ? 'can' : 'cannot'} see every order, and{' '}
            {can('pricing') ? 'can' : 'cannot'} see pricing and invoices. Your role decides which
            screens exist at all.
          </p>
          <button
            type="button"
            className="si-submit"
            disabled={leaving}
            onClick={handled(async () => {
              setLeaving(true)
              try {
                await signOut()
                setEmail('')
                setPassword('')
                navigate({ to: '/signin', replace: true })
              } finally {
                setLeaving(false)
              }
            })}
          >
            {leaving ? (
              'Signing out…'
            ) : (
              <>
                Sign out
                <ArrowIcon />
              </>
            )}
          </button>
          <p className="si-foot">
            <LockIcon size={16} />
            Secure access to your {COMPANY_NAME} workspace.
          </p>
        </div>
      </div>
    )
  }

  const toggleNote = (k: keyof typeof NOTES) => setNote((n) => (n === k ? null : k))

  return (
    <div className="si">
      <section className="si-hero">
        <div className="si-hero-in">
          <Mark height={120} crop={280} />
          <h1 className="si-title">
            Trusted Title Solutions
            <br />
            for a Smoother Tomorrow
          </h1>
          <p className="si-lede">
            {COMPANY_NAME} provides comprehensive title search and property report services to help
            you move transactions forward with confidence.
          </p>
          <ul className="si-feats">
            {FEATURES.map(([Glyph, title, detail]) => (
              <li key={title}>
                <span className="si-tile">
                  <Glyph />
                </span>
                <span>
                  <b>{title}</b>
                  <span>{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="si-scene">
          <Street />
          <div className="si-slant" aria-hidden="true" />
        </div>
      </section>

      <section className="si-side">
        <div className="si-card">
          <div className="si-card-mark">
            <Mark height={100} crop={240} />
          </div>
          <h2 className="si-welcome">Welcome back</h2>
          <p className="si-sub">Sign in to your {COMPANY_NAME} Portal</p>

          <form onSubmit={handled(submit)} className="si-form">
            <div className="fld">
              <label htmlFor="si-email">Work Email</label>
              <div className="si-inp">
                <MailIcon />
                <input
                  className="inp"
                  id="si-email"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="name@firstkeytitle.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                />
              </div>
            </div>

            <div className="fld">
              <label htmlFor="si-password">Password</label>
              <div className="si-inp">
                <LockIcon />
                <input
                  className="inp"
                  id="si-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                />
                <button
                  type="button"
                  className="si-eye"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>

            <div className="si-row">
              <label className="si-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                className="si-link"
                aria-expanded={note === 'forgot'}
                onClick={() => toggleNote('forgot')}
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <Banner kind="d" icon="⚠" style={{ margin: 0 }} title="Could not sign you in">
                {error}
              </Banner>
            ) : null}

            <button type="submit" className="si-submit" disabled={busy}>
              {busy ? (
                'Signing in…'
              ) : (
                <>
                  Sign In
                  <ArrowIcon />
                </>
              )}
            </button>
          </form>

          <div className="si-or">
            <span>Or continue with</span>
          </div>

          <button
            type="button"
            className="si-ms"
            aria-expanded={note === 'microsoft'}
            onClick={() => toggleNote('microsoft')}
          >
            <MicrosoftMark />
            Sign in with Microsoft
          </button>

          {note ? (
            <p className="si-note" role="status">
              {NOTES[note]}
            </p>
          ) : null}

          <p className="si-foot">
            <LockIcon size={16} />
            Secure access to your {COMPANY_NAME} workspace.
          </p>
        </div>

        {DEMO_IDENTITY ? (
          <p className="si-demo">
            The password is asked for but not checked until the database is connected. Sign in with
            anyone’s address on the roster to arrive as them, with their role;{' '}
            <b className="mono">{ADMIN_EMAIL}</b> is the administrator, and an address not on the
            roster opens a staff account.
          </p>
        ) : null}
      </section>
    </div>
  )
}
