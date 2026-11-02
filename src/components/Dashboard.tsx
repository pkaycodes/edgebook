import { useMemo } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Gauge,
  LineChart,
  Plus,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from 'lucide-react'
import type { Trade } from '../../shared/types'
import type { Period } from '../lib/dates'
import { formatRange, startOfPeriod, todayISO } from '../lib/dates'
import {
  buildDailySeries,
  buildInsights,
  bucketBars,
  byMarket,
  computeStats,
  maxDrawdown,
  openTrades,
  realizedTrades,
  sortByDateDesc,
  tradeDate,
  withAnchor,
} from '../lib/analytics'
import { formatMoney } from '../lib/format'
import { BreakdownList } from './BreakdownList'
import { DailyBars } from './DailyBars'
import { EquityChart } from './EquityChart'
import { InsightsList } from './InsightsList'
import { OpenPositions } from './OpenPositions'
import { PeriodSelector } from './PeriodSelector'
import { StatCard } from './StatCard'
import { TradeTable } from './TradeTable'
import { WinLossDonut } from './WinLossDonut'

interface DashboardProps {
  trades: Trade[]
  currency: string
  period: Period
  onPeriodChange: (period: Period) => void
  onNewTrade: () => void
  onLoadSample: () => void
  onEditTrade: (trade: Trade) => void
  onViewTrades: () => void
  onViewInsights: () => void
}

export function Dashboard({
  trades,
  currency,
  period,
  onPeriodChange,
  onNewTrade,
  onLoadSample,
  onEditTrade,
  onViewTrades,
  onViewInsights,
}: DashboardProps) {
  const closed = useMemo(() => realizedTrades(trades, period), [trades, period])
  const stats = useMemo(() => computeStats(closed), [closed])
  const daily = useMemo(() => buildDailySeries(closed, period), [closed, period])
  const anchored = useMemo(() => withAnchor(daily), [daily])
  const bars = useMemo(() => bucketBars(daily, 20), [daily])
  const markets = useMemo(() => byMarket(closed), [closed])
  const open = useMemo(() => openTrades(trades), [trades])
  const insights = useMemo(() => buildInsights(closed, stats, currency), [closed, stats, currency])
  const recent = useMemo(() => sortByDateDesc(trades).slice(0, 6), [trades])
  const drawdown = useMemo(() => maxDrawdown(closed), [closed])

  const firstDate = closed[0] ? tradeDate(closed[0]) : null
  const rangeStart = startOfPeriod(period) ?? firstDate ?? todayISO()
  const rangeLabel = formatRange(rangeStart, todayISO())
  const sparkValues = daily.map((point) => point.value)
  const netTone = stats.net > 0 ? 'win' : stats.net < 0 ? 'loss' : 'neutral'
  const factor = stats.profitFactor === null ? (stats.wins > 0 ? '∞' : '—') : stats.profitFactor.toFixed(2)
  const insightCount = Math.min(3, insights.length)

  if (trades.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Your book, at a glance</h1>
            <p className="page-sub">No closed trades yet — the numbers start with your first entry.</p>
          </div>
        </div>

        <div className="onboarding card">
          <div className="onboarding-copy">
            <span className="eyebrow">
              <Sparkles size={12} />
              Fresh journal
            </span>
            <h2>Your edge starts with a first entry.</h2>
            <p>
              Log every closed position and Edgebook builds the part most traders skip: a clean
              record of win rate, profit factor, drawdowns and the setups that actually pay.
            </p>
            <div className="onboarding-actions">
              <button type="button" className="btn btn-primary" onClick={onNewTrade}>
                <Plus />
                Log your first trade
              </button>
              <button type="button" className="btn btn-ghost" onClick={onLoadSample}>
                <Wand2 />
                Load sample trades
              </button>
            </div>
            <ul className="onboarding-points">
              <li>Crypto, stocks and forex in one ledger</li>
              <li>Realized P&amp;L, fees and expectancy, automatic</li>
              <li>Insights that read your own habits back to you</li>
            </ul>
          </div>
          <div className="onboarding-art" aria-hidden="true">
            <div className="onboarding-glow" />
            <div className="onboarding-chart card">
              <div className="onboarding-chart-head">
                <span>Equity</span>
                <span className="win">+$4,820</span>
              </div>
              <svg viewBox="0 0 300 130" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="onboarding-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9f75a" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c9f75a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 104 L34 96 L66 106 L98 84 L130 90 L162 68 L194 76 L226 46 L258 55 L300 24 L300 130 L0 130 Z"
                  fill="url(#onboarding-fill)"
                />
                <path
                  d="M0 104 L34 96 L66 106 L98 84 L130 90 L162 68 L194 76 L226 46 L258 55 L300 24"
                  fill="none"
                  stroke="#c9f75a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="onboarding-chart-foot">
                <span>Win rate <b>61%</b></span>
                <span>Profit factor <b>1.84</b></span>
              </div>
            </div>
            <div className="onboarding-chip chip-a">
              <Target />
              <span>
                <b>Longs</b> 64% win
              </span>
            </div>
            <div className="onboarding-chip chip-b">
              <LineChart />
              <span>
                <b>Breakout</b> best setup
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Your book, at a glance</h1>
          <p className="page-sub">
            Closed trades · {rangeLabel} · {stats.count} {stats.count === 1 ? 'trade' : 'trades'}
          </p>
        </div>
        <div className="page-actions">
          <PeriodSelector value={period} onChange={onPeriodChange} />
          <button type="button" className="btn btn-ghost page-add" onClick={onNewTrade}>
            <Plus />
            Log trade
          </button>
        </div>
      </div>

      <div className="stat-row">
        <StatCard
          label="Net P&L"
          value={formatMoney(stats.net, currency, { signed: true })}
          tone={netTone}
          icon={TrendingUp}
          spark={sparkValues}
          sub={
            <>
              <span className="stat-inline">
                Realized · {stats.count} {stats.count === 1 ? 'trade' : 'trades'}
              </span>{' '}
              {drawdown.amount > 0 ? (
                <span className="stat-inline loss">· {formatMoney(-drawdown.amount, currency, { signed: true })} max DD</span>
              ) : null}
            </>
          }
        />
        <StatCard
          label="Win rate"
          value={`${stats.winRate.toFixed(0)}%`}
          icon={Target}
          meter={stats.winRate}
          tone={stats.winRate >= 50 ? 'win' : 'loss'}
          sub={
            <>
              {stats.wins}W · {stats.losses}L
              {stats.breakeven > 0 ? ` · ${stats.breakeven}BE` : ''}
            </>
          }
        />
        <StatCard
          label="Profit factor"
          value={factor}
          icon={Scale}
          tone={stats.profitFactor !== null && stats.profitFactor >= 1 ? 'win' : 'neutral'}
          sub={
            <>
              {formatMoney(stats.avgWin, currency, { compact: true })} avg win ·{' '}
              {formatMoney(stats.avgLoss, currency, { compact: true })} avg loss
            </>
          }
        />
        <StatCard
          label="Expectancy"
          value={formatMoney(stats.expectancy, currency, { signed: true })}
          icon={Gauge}
          tone={stats.expectancy > 0 ? 'win' : 'loss'}
          sub={
            <>
              {stats.payoff > 0 ? `${stats.payoff.toFixed(2)}× payoff` : 'No payoff yet'} ·{' '}
              {stats.avgHold.toFixed(1)}d avg hold
            </>
          }
        />
      </div>

      <div className="dash-grid">
        <section className="card card-pad span-8 equity-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Equity curve</h2>
              <p className="card-sub">Cumulative realized P&amp;L · {rangeLabel}</p>
            </div>
            <div className="chart-legend">
              <span className="chart-legend-dot" />
              Net {formatMoney(stats.net, currency, { signed: true })}
            </div>
          </div>
          <EquityChart points={anchored} currency={currency} />
        </section>

        <section className="card card-pad span-4 insights-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">What your numbers say</h2>
              <p className="card-sub">Signals from this period</p>
            </div>
            <button type="button" className="card-link" onClick={onViewInsights}>
              All <ArrowUpRight />
            </button>
          </div>
          <InsightsList insights={insights} limit={3} />
          {insights.length > insightCount ? (
            <button type="button" className="btn btn-subtle btn-full insights-more" onClick={onViewInsights}>
              See all {insights.length} insights
              <ArrowRight />
            </button>
          ) : null}
        </section>

        <section className="card card-pad span-5">
          <div className="card-head">
            <div>
              <h2 className="card-title">Daily P&amp;L</h2>
              <p className="card-sub">Green days versus red days</p>
            </div>
            <span className="chart-legend chart-legend-muted">
              {bars.length} {bars.length === 1 ? 'bucket' : 'buckets'}
            </span>
          </div>
          <DailyBars bars={bars} currency={currency} />
        </section>

        <section className="card card-pad span-3 donut-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Win / loss</h2>
              <p className="card-sub">{stats.count} closed trades</p>
            </div>
          </div>
          <WinLossDonut
            wins={stats.wins}
            losses={stats.losses}
            breakeven={stats.breakeven}
            winRate={stats.winRate}
          />
          <div className="donut-foot">
            <div>
              <span>Avg win</span>
              <strong className="win">{formatMoney(stats.avgWin, currency, { compact: true })}</strong>
            </div>
            <div>
              <span>Avg loss</span>
              <strong className="loss">{formatMoney(stats.avgLoss, currency, { compact: true })}</strong>
            </div>
          </div>
        </section>

        <section className="card card-pad span-4 market-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">By market</h2>
              <p className="card-sub">Where the P&amp;L comes from</p>
            </div>
          </div>
          <BreakdownList items={markets} currency={currency} limit={3} emptyText="No markets traded in this period." />
          <div className="market-foot">
            <span>
              Volume <b className="tabular">{formatMoney(stats.volume, currency, { compact: true })}</b>
            </span>
            <span>
              Fees <b className="tabular">{formatMoney(stats.fees, currency, { compact: true })}</b>
            </span>
          </div>
        </section>

        <section className="card card-pad span-8 recent-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Recent trades</h2>
              <p className="card-sub">Latest entries across your book</p>
            </div>
            <button type="button" className="card-link" onClick={onViewTrades}>
              View all <ArrowUpRight />
            </button>
          </div>
          <TradeTable trades={recent} currency={currency} onEdit={onEditTrade} compact />
        </section>

        <section className="card card-pad span-4 open-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Open positions</h2>
              <p className="card-sub">
                {open.length} live {open.length === 1 ? 'position' : 'positions'}
              </p>
            </div>
            <button type="button" className="card-link" onClick={onNewTrade}>
              <Plus /> Add
            </button>
          </div>
          <OpenPositions trades={open} currency={currency} onEdit={onEditTrade} />
        </section>
      </div>
    </div>
  )
}
