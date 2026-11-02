import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Trade } from '../../shared/types'
import type { Market, Side, TradeStatus } from '../../shared/constants'
import { MARKET_LABELS } from '../../shared/constants'
import { computeStats, tradeDate, tradeResult } from '../lib/analytics'
import { formatMoney } from '../lib/format'
import { exportTradesCsv } from '../lib/export'
import { TradeTable } from './TradeTable'

interface TradesPageProps {
  trades: Trade[]
  currency: string
  onNewTrade: () => void
  onEditTrade: (trade: Trade) => void
  onDeleteTrade: (trade: Trade) => void
}

type SortKey = 'newest' | 'oldest' | 'best' | 'worst' | 'symbol'

export function TradesPage({ trades, currency, onNewTrade, onEditTrade, onDeleteTrade }: TradesPageProps) {
  const [search, setSearch] = useState('')
  const [market, setMarket] = useState<'all' | Market>('all')
  const [side, setSide] = useState<'all' | Side>('all')
  const [status, setStatus] = useState<'all' | TradeStatus>('all')
  const [strategy, setStrategy] = useState('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [limit, setLimit] = useState(25)

  const strategies = useMemo(
    () => [...new Set(trades.map((trade) => trade.strategy.trim()).filter(Boolean))].sort(),
    [trades],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = trades.filter((trade) => {
      if (market !== 'all' && trade.market !== market) return false
      if (side !== 'all' && trade.side !== side) return false
      if (status !== 'all' && trade.status !== status) return false
      if (strategy !== 'all' && trade.strategy !== strategy) return false
      if (query) {
        const haystack = `${trade.symbol} ${trade.strategy} ${trade.notes}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })

    return list.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return tradeDate(a).localeCompare(tradeDate(b))
        case 'best':
          return (tradeResult(b).net ?? -Infinity) - (tradeResult(a).net ?? -Infinity)
        case 'worst':
          return (tradeResult(a).net ?? Infinity) - (tradeResult(b).net ?? Infinity)
        case 'symbol':
          return a.symbol.localeCompare(b.symbol)
        default:
          return (
            tradeDate(b).localeCompare(tradeDate(a)) ||
            b.createdAt.localeCompare(a.createdAt)
          )
      }
    })
  }, [trades, market, side, status, strategy, search, sort])

  useEffect(() => {
    setLimit(25)
  }, [market, side, status, strategy, sort])

  const closed = useMemo(
    () => filtered.filter((trade) => tradeResult(trade).isClosed),
    [filtered],
  )
  const stats = useMemo(() => computeStats(closed), [closed])
  const openCount = trades.filter((trade) => trade.status === 'open').length
  const visible = filtered.slice(0, limit)
  const filtersActive =
    search !== '' || market !== 'all' || side !== 'all' || status !== 'all' || strategy !== 'all'

  function clearFilters() {
    setSearch('')
    setMarket('all')
    setSide('all')
    setStatus('all')
    setStrategy('all')
    setLimit(25)
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Trade ledger</h1>
          <p className="page-sub">
            {trades.length === 0
              ? 'Your ledger is empty — log a trade to get started.'
              : `${trades.length} ${trades.length === 1 ? 'trade' : 'trades'} total · ${openCount} open · click any row to edit`}
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => exportTradesCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download />
            Export CSV
          </button>
          <button type="button" className="btn btn-primary page-add" onClick={onNewTrade}>
            <Plus />
            Log trade
          </button>
        </div>
      </div>

      <div className="summary-strip">
        <div className="summary-item">
          <span>Trades</span>
          <strong className="tabular">{filtered.length}</strong>
        </div>
        <div className="summary-item">
          <span>Net P&amp;L</span>
          <strong className={`tabular ${stats.net > 0 ? 'win' : stats.net < 0 ? 'loss' : ''}`}>
            {formatMoney(stats.net, currency, { signed: true })}
          </strong>
        </div>
        <div className="summary-item">
          <span>Win rate</span>
          <strong className="tabular">{stats.winRate.toFixed(0)}%</strong>
        </div>
        <div className="summary-item">
          <span>Volume</span>
          <strong className="tabular">{formatMoney(stats.volume, currency, { compact: true })}</strong>
        </div>
        <div className="summary-item">
          <span>Fees</span>
          <strong className="tabular">{formatMoney(stats.fees, currency, { compact: true })}</strong>
        </div>
      </div>

      <div className="toolbar card">
        <div className="toolbar-search">
          <Search />
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setLimit(25)
            }}
            placeholder="Search symbol, strategy or notes…"
            aria-label="Search trades"
          />
        </div>

        <div className="toolbar-filters">
          <span className="toolbar-icon" aria-hidden="true">
            <SlidersHorizontal />
          </span>
          <select
            className="select toolbar-select"
            value={market}
            onChange={(event) => setMarket(event.target.value as 'all' | Market)}
            aria-label="Filter by market"
          >
            <option value="all">All markets</option>
            {Object.entries(MARKET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="select toolbar-select"
            value={side}
            onChange={(event) => setSide(event.target.value as 'all' | Side)}
            aria-label="Filter by direction"
          >
            <option value="all">Long &amp; short</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <select
            className="select toolbar-select"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'all' | TradeStatus)}
            aria-label="Filter by status"
          >
            <option value="all">Any status</option>
            <option value="closed">Closed</option>
            <option value="open">Open</option>
          </select>
          <select
            className="select toolbar-select"
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
            aria-label="Filter by strategy"
          >
            <option value="all">All strategies</option>
            {strategies.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="select toolbar-select toolbar-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort trades"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="best">Biggest win</option>
            <option value="worst">Biggest loss</option>
            <option value="symbol">Symbol A–Z</option>
          </select>
          {filtersActive ? (
            <button type="button" className="btn btn-subtle btn-sm clear-filters" onClick={clearFilters}>
              <X />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="card trades-card">
        {trades.length === 0 ? (
          <div className="empty trades-empty">
            <span className="empty-icon">
              <Plus />
            </span>
            <strong className="empty-title">No trades logged yet</strong>
            <p className="empty-text">
              Add your first position to start building an equity curve, or load sample trades to
              see how the dashboard looks with a full book.
            </p>
            <div className="empty-actions">
              <button type="button" className="btn btn-primary" onClick={onNewTrade}>
                <Plus />
                Log a trade
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty trades-empty">
            <span className="empty-icon">
              <Search />
            </span>
            <strong className="empty-title">Nothing matches those filters</strong>
            <p className="empty-text">Try a different symbol, market or status.</p>
            <div className="empty-actions">
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          <>
            <TradeTable
              trades={visible}
              currency={currency}
              onEdit={onEditTrade}
              onDelete={onDeleteTrade}
            />
            <div className="table-foot">
              <span>
                Showing {visible.length} of {filtered.length} trades
              </span>
              {visible.length < filtered.length ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLimit((current) => current + 25)}>
                  Load 25 more
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
