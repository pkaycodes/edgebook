import {
  LayoutDashboard,
  LineChart,
  ListOrdered,
  LogOut,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { User } from '../../shared/types'
import type { Page } from '../types'
import { initials } from '../lib/format'
import { Logo } from './Logo'

interface SidebarProps {
  page: Page
  user: User
  tradeCount: number
  mobileOpen: boolean
  onNavigate: (page: Page) => void
  onClose: () => void
  onSignOut: () => void
}

const NAV: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'trades', label: 'Trades', icon: ListOrdered },
  { id: 'insights', label: 'Insights', icon: LineChart },
]

export function Sidebar({
  page,
  user,
  tradeCount,
  mobileOpen,
  onNavigate,
  onClose,
  onSignOut,
}: SidebarProps) {
  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <Logo onClick={() => onNavigate('overview')} />
          <button type="button" className="icon-button sidebar-close" onClick={onClose} aria-label="Close menu">
            <X />
          </button>
        </div>

        <nav className="nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon />
                {item.label}
                {item.id === 'trades' && tradeCount > 0 ? (
                  <span className="nav-count">{tradeCount}</span>
                ) : null}
              </button>
            )
          })}
          <span className="nav-label">Account</span>
          <button
            type="button"
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => onNavigate('settings')}
          >
            <Settings2 />
            Settings
          </button>
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-note">
            <ShieldCheck size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: 'var(--accent)' }} />
            <b>Private by design.</b> Your journal is tied to your account and never shared.
          </div>
          <div className="account">
            <span className="avatar">{initials(user.name)}</span>
            <span className="account-meta">
              <span className="account-name">{user.name}</span>
              <span className="account-email">{user.email}</span>
            </span>
            <button type="button" className="icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out">
              <LogOut />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
