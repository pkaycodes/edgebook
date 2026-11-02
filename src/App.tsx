import { useCallback, useEffect, useRef, useState } from 'react'
import type { CurrencyCode } from '../shared/constants'
import type { SessionPayload, Trade } from '../shared/types'
import { ApiError, api } from './lib/api'
import { exportTradesCsv } from './lib/export'
import type { Period } from './lib/dates'
import type { Page } from './types'
import { AuthPage } from './components/AuthPage'
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog'
import { Dashboard } from './components/Dashboard'
import { InsightsPage } from './components/InsightsPage'
import { LogoMark } from './components/Logo'
import { SettingsPage } from './components/SettingsPage'
import { Sidebar } from './components/Sidebar'
import { ToastStack, type ToastMessage } from './components/Toast'
import { Topbar } from './components/Topbar'
import { TradeDrawer } from './components/TradeDrawer'
import { TradesPage } from './components/TradesPage'

const PAGES: Page[] = ['overview', 'trades', 'insights', 'settings']

function pageFromHash(): Page {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return (PAGES as string[]).includes(hash) ? (hash as Page) : 'overview'
}

export default function App() {
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [bootState, setBootState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [bootError, setBootError] = useState('')
  const [trades, setTrades] = useState<Trade[]>([])
  const [page, setPage] = useState<Page>(pageFromHash)
  const [period, setPeriod] = useState<Period>('30d')
  const [drawer, setDrawer] = useState<{ trade: Trade | null } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const toastId = useRef(0)

  const notify = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    toastId.current += 1
    const id = toastId.current
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3400)
  }, [])

  useEffect(() => {
    function onHashChange() {
      setPage(pageFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    let active = true
    async function boot() {
      try {
        const payload = await api.me()
        const data = await api.trades()
        if (!active) return
        setSession(payload)
        setTrades(data.trades)
        setBootState('ready')
      } catch (cause) {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 401) {
          setSession(null)
          setBootState('ready')
          return
        }
        setBootError(cause instanceof Error ? cause.message : 'Could not reach the Edgebook server.')
        setBootState('error')
      }
    }
    void boot()
    return () => {
      active = false
    }
  }, [])

  function navigate(next: Page) {
    setPage(next)
    setSidebarOpen(false)
    window.location.hash = `/${next}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleAuthenticated(payload: SessionPayload) {
    setBootState('loading')
    setSession(payload)
    try {
      const data = await api.trades()
      setTrades(data.trades)
    } catch {
      notify('Signed in, but your trades could not load. Refresh to try again.', 'error')
    }
    setBootState('ready')
    navigate('overview')
  }

  async function signOut() {
    try {
      await api.logout()
    } catch {
      // The cookie may already be gone — treat it as signed out either way.
    }
    setSession(null)
    setTrades([])
    setDrawer(null)
    setConfirm(null)
    setPage('overview')
    window.location.hash = ''
    notify('Signed out. See you at the next close.')
  }

  async function saveTrade(draft: Parameters<typeof api.createTrade>[0], id?: string) {
    if (id) {
      const { trade } = await api.updateTrade(id, draft)
      setTrades((current) => current.map((item) => (item.id === id ? trade : item)))
      notify('Trade updated.')
    } else {
      const { trade } = await api.createTrade(draft)
      setTrades((current) => [trade, ...current])
      notify('Trade logged.')
    }
    setDrawer(null)
  }

  function requestDeleteTrade(trade: Trade) {
    setConfirm({
      title: `Delete ${trade.symbol}?`,
      body: 'This closes the book on this trade and removes it from every chart and insight. It cannot be undone.',
      confirmLabel: 'Delete trade',
      tone: 'danger',
      action: async () => {
        await api.deleteTrade(trade.id)
        setTrades((current) => current.filter((item) => item.id !== trade.id))
        setDrawer(null)
        notify('Trade deleted.')
      },
    })
  }

  function requestClearTrades() {
    setConfirm({
      title: 'Clear the whole ledger?',
      body: `All ${trades.length} trades will be deleted. Your account and preferences stay intact. This cannot be undone.`,
      confirmLabel: 'Clear ledger',
      tone: 'danger',
      action: async () => {
        await api.clearTrades()
        setTrades([])
        notify('Ledger cleared.')
      },
    })
  }

  function requestDeleteAccount() {
    setConfirm({
      title: 'Delete your account?',
      body: 'Your profile, trades and sessions will be permanently removed. There is no recovery. Demo accounts can always be recreated.',
      confirmLabel: 'Delete account',
      tone: 'danger',
      action: async () => {
        await api.deleteAccount()
        setSession(null)
        setTrades([])
        setDrawer(null)
        setPage('overview')
        window.location.hash = ''
        notify('Account deleted.')
      },
    })
  }

  async function runConfirm() {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      await confirm.action()
      setConfirm(null)
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'That did not work. Try again.', 'error')
    } finally {
      setConfirmBusy(false)
    }
  }

  async function loadSampleTrades() {
    try {
      const data = await api.loadSampleTrades()
      setTrades(data.trades)
      notify(`${data.inserted} sample trades loaded.`)
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Could not load sample trades.', 'error')
    }
  }

  async function updateProfile(name: string) {
    const payload = await api.updateProfile(name)
    setSession(payload)
    notify('Profile updated.')
  }

  async function updateCurrency(currency: CurrencyCode) {
    await api.updateSettings(currency)
    setSession((current) => (current ? { ...current, settings: { currency } } : current))
    notify(`Display currency set to ${currency}.`)
  }

  if (bootState === 'loading') {
    return (
      <div className="boot">
        <div className="boot-mark">
          <LogoMark size={26} />
        </div>
        <div className="spinner" />
        <span>Opening your book…</span>
      </div>
    )
  }

  if (bootState === 'error') {
    return (
      <div className="boot">
        <div className="boot-mark">
          <LogoMark size={26} />
        </div>
        <strong className="boot-title">The journal is out of reach</strong>
        <p className="boot-text">{bootError}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <>
        <AuthPage onAuthenticated={(payload) => void handleAuthenticated(payload)} />
        <ToastStack toasts={toasts} />
      </>
    )
  }

  const currency = session.settings.currency

  return (
    <>
      <div className="shell">
        <Sidebar
          page={page}
          user={session.user}
          tradeCount={trades.length}
          mobileOpen={sidebarOpen}
          onNavigate={navigate}
          onClose={() => setSidebarOpen(false)}
          onSignOut={() => void signOut()}
        />
        <div className="app-main">
          <Topbar
            page={page}
            onMenu={() => setSidebarOpen(true)}
            onNewTrade={() => setDrawer({ trade: null })}
          />
          <main>
            {page === 'overview' ? (
              <Dashboard
                trades={trades}
                currency={currency}
                period={period}
                onPeriodChange={setPeriod}
                onNewTrade={() => setDrawer({ trade: null })}
                onLoadSample={() => void loadSampleTrades()}
                onEditTrade={(trade) => setDrawer({ trade })}
                onViewTrades={() => navigate('trades')}
                onViewInsights={() => navigate('insights')}
              />
            ) : null}
            {page === 'trades' ? (
              <TradesPage
                trades={trades}
                currency={currency}
                onNewTrade={() => setDrawer({ trade: null })}
                onEditTrade={(trade) => setDrawer({ trade })}
                onDeleteTrade={requestDeleteTrade}
              />
            ) : null}
            {page === 'insights' ? (
              <InsightsPage
                trades={trades}
                currency={currency}
                period={period}
                onPeriodChange={setPeriod}
                onNewTrade={() => setDrawer({ trade: null })}
              />
            ) : null}
            {page === 'settings' ? (
              <SettingsPage
                user={session.user}
                currency={currency}
                tradeCount={trades.length}
                onUpdateProfile={updateProfile}
                onUpdateCurrency={updateCurrency}
                onSignOut={() => void signOut()}
                onExport={() => exportTradesCsv(trades)}
                onLoadSample={() => void loadSampleTrades()}
                onClearTrades={requestClearTrades}
                onDeleteAccount={requestDeleteAccount}
              />
            ) : null}
          </main>
        </div>
      </div>

      {drawer ? (
        <TradeDrawer
          key={drawer.trade?.id ?? 'new'}
          trade={drawer.trade}
          currency={currency}
          onClose={() => setDrawer(null)}
          onSave={saveTrade}
          onDelete={requestDeleteTrade}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          request={confirm}
          busy={confirmBusy}
          onClose={() => setConfirm(null)}
          onConfirm={() => void runConfirm()}
        />
      ) : null}

      <ToastStack toasts={toasts} />
    </>
  )
}
