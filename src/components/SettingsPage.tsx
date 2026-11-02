import { useState, type FormEvent } from 'react'
import { Download, LogOut, ShieldCheck, Trash2, UserRound, Wand2 } from 'lucide-react'
import { CURRENCIES, type CurrencyCode } from '../../shared/constants'
import type { User } from '../../shared/types'
import { formatDate } from '../lib/dates'
import { initials } from '../lib/format'

interface SettingsPageProps {
  user: User
  currency: CurrencyCode
  tradeCount: number
  onUpdateProfile: (name: string) => Promise<void>
  onUpdateCurrency: (currency: CurrencyCode) => Promise<void>
  onSignOut: () => void
  onExport: () => void
  onLoadSample: () => void
  onClearTrades: () => void
  onDeleteAccount: () => void
}

const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'US dollar',
  EUR: 'Euro',
  GBP: 'British pound',
  GHS: 'Ghanaian cedi',
  NGN: 'Nigerian naira',
  ZAR: 'South African rand',
}

export function SettingsPage({
  user,
  currency,
  tradeCount,
  onUpdateProfile,
  onUpdateCurrency,
  onSignOut,
  onExport,
  onLoadSample,
  onClearTrades,
  onDeleteAccount,
}: SettingsPageProps) {
  const [name, setName] = useState(user.name)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [currencyError, setCurrencyError] = useState('')

  async function submitName(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.')
      return
    }
    setNameError('')
    setSavingName(true)
    try {
      await onUpdateProfile(trimmed)
    } catch (cause) {
      setNameError(cause instanceof Error ? cause.message : 'Could not update your name.')
    } finally {
      setSavingName(false)
    }
  }

  async function changeCurrency(next: CurrencyCode) {
    setCurrencyError('')
    setSavingCurrency(true)
    try {
      await onUpdateCurrency(next)
    } catch (cause) {
      setCurrencyError(cause instanceof Error ? cause.message : 'Could not update your currency.')
    } finally {
      setSavingCurrency(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Account &amp; preferences</h1>
          <p className="page-sub">Everything about your journal, in one place.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="card card-pad settings-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Profile</h2>
              <p className="card-sub">How your journal addresses you</p>
            </div>
            {user.isDemo ? <span className="badge badge-open">Demo account</span> : null}
          </div>

          <div className="profile-row">
            <span className="avatar avatar-lg">{initials(user.name)}</span>
            <div>
              <strong className="profile-name">{user.name}</strong>
              <span className="profile-meta">
                Joined {formatDate(user.createdAt.slice(0, 10))}
              </span>
            </div>
          </div>

          <form className="settings-form" onSubmit={(event) => void submitName(event)}>
            <label className="field">
              <span className="field-label">Display name</span>
              <input
                className="input"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setNameError('')
                }}
                maxLength={60}
              />
              {nameError ? <span className="field-error">{nameError}</span> : null}
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <input className="input" value={user.email} readOnly disabled />
            </label>
            <button type="submit" className="btn btn-primary settings-save" disabled={savingName}>
              {savingName ? <span className="spinner" /> : <UserRound />}
              Save profile
            </button>
          </form>
        </section>

        <section className="card card-pad settings-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Display</h2>
              <p className="card-sub">How numbers appear across the app</p>
            </div>
          </div>

          <label className="field">
            <span className="field-label">
              Base currency
              {savingCurrency ? <span className="field-hint">Saving…</span> : null}
            </span>
            <select
              className="select"
              value={currency}
              onChange={(event) => void changeCurrency(event.target.value as CurrencyCode)}
              disabled={savingCurrency}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code} — {CURRENCY_NAMES[code]}
                </option>
              ))}
            </select>
            {currencyError ? <span className="field-error">{currencyError}</span> : null}
            <span className="field-hint">
              Display only. Edgebook does not convert past trade values — pairs stay in their own
              quote currency.
            </span>
          </label>

          <div className="settings-note">
            <ShieldCheck />
            <div>
              <strong>Private by default</strong>
              <span>
                Sessions are httpOnly cookies. Your trades are scoped to your account and never
                shared or sold.
              </span>
            </div>
          </div>
        </section>

        <section className="card card-pad settings-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Your data</h2>
              <p className="card-sub">{tradeCount} trades in this journal</p>
            </div>
          </div>

          <div className="settings-actions">
            <button type="button" className="btn btn-ghost" onClick={onExport} disabled={tradeCount === 0}>
              <Download />
              Export trades as CSV
            </button>
            {tradeCount === 0 ? (
              <button type="button" className="btn btn-ghost" onClick={onLoadSample}>
                <Wand2 />
                Load sample trades
              </button>
            ) : null}
          </div>

          <div className="settings-divider" />

          <div className="danger-row">
            <div>
              <strong>Clear the ledger</strong>
              <span>Delete every trade in this account. Your profile stays.</span>
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={onClearTrades} disabled={tradeCount === 0}>
              <Trash2 />
              Clear
            </button>
          </div>
        </section>

        <section className="card card-pad settings-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Session</h2>
              <p className="card-sub">Signed in as {user.email}</p>
            </div>
          </div>

          <div className="settings-actions">
            <button type="button" className="btn btn-ghost" onClick={onSignOut}>
              <LogOut />
              Sign out
            </button>
          </div>

          <div className="settings-divider" />

          <div className="danger-row">
            <div>
              <strong>Delete account</strong>
              <span>Removes your profile, trades and sessions permanently.</span>
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={onDeleteAccount}>
              <Trash2 />
              Delete
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
