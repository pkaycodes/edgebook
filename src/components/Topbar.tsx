import { Menu, Plus } from 'lucide-react'
import type { Page } from '../types'

interface TopbarProps {
  page: Page
  onMenu: () => void
  onNewTrade: () => void
}

const TITLES: Record<Page, { title: string; sub: string }> = {
  overview: { title: 'Overview', sub: 'Your edge, measured.' },
  trades: { title: 'Trades', sub: 'Every position, one ledger.' },
  insights: { title: 'Insights', sub: 'The patterns behind the P&L.' },
  settings: { title: 'Settings', sub: 'Account and preferences.' },
}

export function Topbar({ page, onMenu, onNewTrade }: TopbarProps) {
  const meta = TITLES[page]
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="icon-button menu-toggle" onClick={onMenu} aria-label="Open menu">
          <Menu />
        </button>
        <div>
          <div className="topbar-title">{meta.title}</div>
          <span className="topbar-sub">{meta.sub}</span>
        </div>
      </div>
      <div className="topbar-actions">
        <button type="button" className="btn btn-primary" onClick={onNewTrade}>
          <Plus />
          <span className="new-trade-label">New trade</span>
        </button>
      </div>
    </header>
  )
}
