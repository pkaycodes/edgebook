import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, UserRound } from 'lucide-react'
import type { SessionPayload } from '../../shared/types'
import { ApiError, api } from '../lib/api'
import { Logo } from './Logo'

interface AuthPageProps {
  onAuthenticated: (session: SessionPayload) => void
}

type Mode = 'signin' | 'signup'

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (mode === 'signup' && name.trim().length < 2) {
      setError('Tell us your name — at least 2 characters.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy('form')
    try {
      const session =
        mode === 'signin'
          ? await api.login(email, password)
          : await api.register(name.trim(), email, password)
      onAuthenticated(session)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not reach the server. Try again.')
      setBusy(null)
    }
  }

  async function openDemo() {
    setError('')
    setBusy('demo')
    try {
      const session = await api.demo()
      onAuthenticated(session)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not start the demo. Try again.')
      setBusy(null)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  return (
    <div className="auth">
      <section className="auth-brand">
        <div className="auth-brand-top">
          <Logo />
        </div>

        <div className="auth-hero">
          <span className="eyebrow">
            <Sparkles size={12} />
            Trading journal
          </span>
          <h1 className="auth-headline">
            Know your edge.
            <br />
            <span>Trade the numbers.</span>
          </h1>
          <p className="auth-lede">
            Log every position across crypto, stocks and forex. Edgebook turns them into a clean
            P&amp;L dashboard — win rate, profit factor, drawdowns and the setups that actually pay.
          </p>

          <div className="auth-chart card">
            <div className="auth-chart-head">
              <div>
                <span className="auth-chart-label">Equity curve</span>
                <strong className="auth-chart-value">$12,480.20</strong>
              </div>
              <span className="auth-chart-delta">+18.4%</span>
            </div>
            <svg viewBox="0 0 520 132" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="auth-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9f75a" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#c9f75a" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[24, 58, 92].map((y) => (
                <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="#202932" strokeWidth="1" />
              ))}
              <path
                d="M0 104 L42 97 L82 106 L120 88 L158 92 L196 74 L232 80 L270 60 L308 67 L344 48 L382 55 L420 33 L460 39 L520 18 L520 132 L0 132 Z"
                fill="url(#auth-fill)"
              />
              <path
                d="M0 104 L42 97 L82 106 L120 88 L158 92 L196 74 L232 80 L270 60 L308 67 L344 48 L382 55 L420 33 L460 39 L520 18"
                fill="none"
                stroke="#c9f75a"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx="520" cy="18" r="4" fill="#c9f75a" />
            </svg>
            <div className="auth-chart-stats">
              <div>
                <span>Win rate</span>
                <strong>61%</strong>
              </div>
              <div>
                <span>Profit factor</span>
                <strong>1.84</strong>
              </div>
              <div>
                <span>Max drawdown</span>
                <strong className="loss">−6.2%</strong>
              </div>
            </div>
          </div>

          <ul className="auth-points">
            <li>Private, account-based journal</li>
            <li>Crypto, stocks &amp; forex in one ledger</li>
            <li>Insights that read your habits back to you</li>
          </ul>
        </div>

        <p className="auth-foot">Built for traders who keep score.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-head">
            <h2>{mode === 'signin' ? 'Welcome back' : 'Create your journal'}</h2>
            <p>
              {mode === 'signin'
                ? 'Sign in to pick up where your equity curve left off.'
                : 'One account, every market. No spreadsheets required.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Authentication">
            <button
              type="button"
              className={mode === 'signin' ? 'active' : ''}
              onClick={() => switchMode('signin')}
              role="tab"
              aria-selected={mode === 'signin'}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => switchMode('signup')}
              role="tab"
              aria-selected={mode === 'signup'}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            {mode === 'signup' ? (
              <label className="field">
                <span className="field-label">Name</span>
                <span className="auth-input-wrap">
                  <UserRound />
                  <input
                    className="input auth-input"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Alex Mensah"
                    autoComplete="name"
                    maxLength={60}
                  />
                </span>
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">Email</span>
              <span className="auth-input-wrap">
                <Mail />
                <input
                  className="input auth-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={254}
                />
              </span>
            </label>

            <label className="field">
              <span className="field-label">
                Password
                <span className="field-hint">{mode === 'signup' ? 'At least 8 characters' : ''}</span>
              </span>
              <span className="auth-input-wrap">
                <Lock />
                <input
                  className="input auth-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>

            {error ? <div className="form-error">{error}</div> : null}

            <button type="submit" className="btn btn-primary btn-full auth-submit" disabled={busy !== null}>
              {busy === 'form' ? <span className="spinner" /> : null}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
              {busy === 'form' ? null : <ArrowRight />}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button type="button" className="btn btn-ghost btn-full auth-demo" onClick={() => void openDemo()} disabled={busy !== null}>
            {busy === 'demo' ? <span className="spinner" /> : <Sparkles />}
            Explore the demo account
            {busy === 'demo' ? null : <ArrowRight />}
          </button>
          <p className="auth-hint">Preloaded with 49 sample trades so you can look around.</p>

          <p className="auth-legal">
            Your journal stays tied to your account. We never connect to your exchange or ask for API
            keys.
          </p>
        </div>
      </section>
    </div>
  )
}
