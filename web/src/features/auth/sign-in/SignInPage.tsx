import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { useQueryClient } from '@tanstack/react-query'
import { IconButton, Press } from '@/shared/ui/Button'
import { Checkbox, Input } from '@/shared/ui/Controls'
import { Field, Form, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { useTitlePart } from '@/shared/hooks/useTitlePart'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { COMPANY_GLYPH, COMPANY_NAME, LOGO_HEIGHT, LOGO_URL } from '@/data/brand'
import { initials } from '@/shared/lib/format'
import { can as capabilityOf, mayVisit, roleName } from '@/domain/auth/permissions'
import { DEMO_IDENTITY } from '@/shared/lib/demo'
import { ADMIN_EMAIL } from '@/domain/auth/credentials'
import { signInOnSeed } from '@/domain/auth/seedSession'
import { ApiError, startSession } from '@/shared/lib/api'
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
} from './SignInArt'
import { personById } from '@/domain/people/roster'

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

const NOTES = {
  forgot: `Password reset by email is not set up yet. Ask your ${COMPANY_NAME} administrator for a new password.`,
  microsoft: 'Microsoft sign-in is not switched on for this workspace yet. Use your work email and password.',
} as const

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
  useTitlePart('page', authState === 'anonymous' ? 'Sign in' : 'Sign out')
  const { toast } = useUi()
  const navigate = useGo()
  const stageName = useStageName()
  const queryClient = useQueryClient()
  const next = useRouterState({
    select: (s) => (s.location.search as { next?: string }).next,
  })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const alert = useFormAlert<'email' | 'password'>()
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [note, setNote] = useState<keyof typeof NOTES | null>(null)
  const [leaving, setLeaving] = useState(false)

  const landing = (personId: string) => {
    const person = personById(personId)
    const wanted = next?.split('/').filter(Boolean)[0]
    if (next && wanted && mayVisit(person, wanted)) return next
    return capabilityOf(person, 'all') ? '/dash' : '/mywork'
  }

  const noServiceBehind = (e: unknown) =>
    !(e instanceof ApiError) || e.status === 404 || e.status === 0 || e.status >= 500

  const submit = async () => {
    if (!email.trim()) return alert.fail('Enter your work email.', 'email')
    if (!password) return alert.fail('Enter your password.', 'password')
    alert.clear()
    setNote(null)
    setBusy(true)
    try {
      await startSession(email, password, remember)
      await queryClient.resetQueries()
      navigate({ to: next ?? '/dash', replace: true })
    } catch (err) {
      if (!noServiceBehind(err)) {
        alert.fail(err instanceof ApiError ? err.message : 'That email and password did not match.')
        setBusy(false)
        return
      }

      if (!DEMO_IDENTITY) {
        alert.fail('This build signs in against the database. The sign-in service is not reachable.')
        setBusy(false)
        return
      }

      const check = signInOnSeed(email, password)
      if (!check.ok) {
        alert.fail(check.error)
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
                {roleName(me.r)} · {me.dep.map(stageName).join(', ') || 'No department'}
              </span>
            </span>
          </div>
          <p className="so-can">
            You {can('all') ? 'can' : 'cannot'} see every order, and{' '}
            {can('pricing') ? 'can' : 'cannot'} see pricing and invoices. Your role decides which
            screens exist at all.
          </p>
          <Press
            className="si-submit"
            label={leaving ? 'Signing out…' : 'Sign out'}
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
          </Press>
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

          <Form onSubmit={handled(submit)} className="si-form">
            <Field label="Work Email" id="si-email" error={alert.on('email')}>
              <div className="si-inp">
                <MailIcon />
                <Input
                  field
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="name@firstkeytitle.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    alert.clear()
                  }}
                />
              </div>
            </Field>

            <Field label="Password" id="si-password" error={alert.on('password')}>
              <div className="si-inp">
                <LockIcon />
                <Input
                  field
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    alert.clear()
                  }}
                />
                <IconButton
                  className="si-eye"
                  label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <EyeIcon off={showPassword} />
                </IconButton>
              </div>
            </Field>

            <div className="si-row">
              <Field layout="wrap" className="si-check" label="Remember me">
                <Checkbox field checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              </Field>
              <Press
                className="si-link"
                aria-expanded={note === 'forgot'}
                onClick={() => toggleNote('forgot')}
              >
                Forgot password?
              </Press>
            </div>

            <FormAlert alert={alert} title="Could not sign you in" margin={0} />

            <Press submit className="si-submit" label={busy ? 'Signing in…' : 'Sign in'} disabled={busy}>
              {busy ? (
                'Signing in…'
              ) : (
                <>
                  Sign In
                  <ArrowIcon />
                </>
              )}
            </Press>
          </Form>

          <div className="si-or">
            <span>Or continue with</span>
          </div>

          <Press
            className="si-ms"
            label="Sign in with Microsoft"
            aria-expanded={note === 'microsoft'}
            onClick={() => toggleNote('microsoft')}
          >
            <MicrosoftMark />
            Sign in with Microsoft
          </Press>

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
