import { useMemo } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, Gauge, Plus } from 'lucide-react'
import type { Trade } from '../../shared/types'
import type { Period } from '../lib/dates'
import { formatDate, formatRange, startOfPeriod, todayISO } from '../lib/dates'
import {
  bestAndWorstDay,
  buildDailySeries,
  buildInsights,
  byStrategy,
  bySymbol,
  byWeekday,
  computeStats,
  maxDrawdown,
  pnlHistogram,
  realizedTrades,
  tradeDate,
  tradeResult,
} from '../lib/analytics'
import { formatMoney, formatPct } from '../lib/format'
import { InsightsList } from './InsightsList'
import { PeriodSelector } from './PeriodSelector'
import { StatCard } from './StatCard'

interface InsightsPageProps {
  trades: Trade[]
  currency: string
  period: Period
  onPeriodChange: (period: Period) => void
  onNewTrade: () => void
}

export function InsightsPage({
  trades,
  currency,
  period,
  onPeriodChange,
  onNewTrade,
}: InsightsPageProps) {
  const closed = useMemo(() => realizedTrades(trades, period), [trades, period])
  const stats = useMemo(() => computeStats(closed), [closed])
  const daily = useMemo(() => buildDailySeries(closed, period), [closed, period])
  const drawdown = useMemo(() => maxDrawdown(closed), [closed])
  const days = useMemo(() => bestAndWorstDay(daily), [daily])
  const weekdays = useMemo(() => byWeekday(closed), [closed])
  const strategies = useMemo(() => byStrategy(closed), [closed])
  const symbols = useMemo(() => bySymbol(closed).sort((a, b) => b.net - a.net), [closed])
  const histogram = useMemo(() => pnlHistogram(closed), [closed])
  const insights = useMemo(() => buildInsights(closed, stats, currency), [closed, stats, currency])

  const rangeStart = startOfPeriod(period) ?? (closed[0] ? tradeDate(closed[0]) : todayISO())
  const rangeLabel = formatRange(rangeStart, todayISO())
  const maxWeekday = Math.max(1, ...weekdays.map((day) => Math.abs(day.net)))
  const bestWeekday = [...weekdays].sort((a, b) => b.net - a.net)[0]
  const maxHistogram = Math.max(1, ...histogram.map((bucket) => bucket.count))
  const maxStrategy = Math.max(1, ...strategies.map((item) => Math.abs(item.net)))
  const grossProfit = closed.reduce((total, trade) => {
    const net = tradeResult(trade).net ?? 0
    return net > 0 ? total + net : total
  }, 0)
  const feeShare = grossProfit > 0 ? (stats.fees / grossProfit) * 100 : 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">The pattern behind the P&amp;L</h1>
          <p className="page-sub">
            Closed trades · {rangeLabel} · {stats.count} {stats.count === 1 ? 'trade' : 'trades'}
          </p>
        </div>
        <div className="page-actions">
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </div>
      </div>

      <div className="stat-row">
        <StatCard
          label="Expectancy"
          value={formatMoney(stats.expectancy, currency, { signed: true })}
          icon={Gauge}
          tone={stats.expectancy > 0 ? 'win' : 'loss'}
          sub={`Average result per closed trade · ${stats.payoff > 0 ? `${stats.payoff.toFixed(2)}× payoff` : 'no payoff yet'}`}
        />
        <StatCard
          label="Max drawdown"
          value={drawdown.amount > 0 ? formatMoney(-drawdown.amount, currency, { signed: true }) : '—'}
          icon={Activity}
          tone={drawdown.amount > 0 ? 'loss' : 'neutral'}
          sub={
            drawdown.peakDate && drawdown.troughDate
              ? `${formatDate(drawdown.peakDate, { year: false })} → ${formatDate(drawdown.troughDate, { year: false })}${drawdown.percent !== null ? ` · ${drawdown.percent.toFixed(1)}% of peak` : ''}`
              : 'No drawdown in this period'
          }
        />
        <StatCard
          label="Best day"
          value={days.best ? formatMoney(days.best.delta, currency, { signed: true }) : '—'}
          icon={ArrowUpRight}
          tone={days.best && days.best.delta > 0 ? 'win' : 'neutral'}
          sub={
            days.best
              ? `${formatDate(days.best.date, { year: false })} · ${days.best.trades} ${days.best.trades === 1 ? 'trade' : 'trades'}`
              : 'No results yet'
          }
        />
        <StatCard
          label="Worst day"
          value={days.worst ? formatMoney(days.worst.delta, currency, { signed: true }) : '—'}
          icon={ArrowDownRight}
          tone={days.worst && days.worst.delta < 0 ? 'loss' : 'neutral'}
          sub={
            days.worst
              ? `${formatDate(days.worst.date, { year: false })} · ${days.worst.trades} ${days.worst.trades === 1 ? 'trade' : 'trades'}`
              : 'No results yet'
          }
        />
      </div>

      {closed.length === 0 ? (
        <div className="empty insights-empty">
          <span className="empty-icon">
            <CalendarDays />
          </span>
          <strong className="empty-title">No closed trades in this period</strong>
          <p className="empty-text">
            Close a position (or switch the period) and this page will break down your edge by
            weekday, setup, symbol and trade size.
          </p>
          <div className="empty-actions">
            <button type="button" className="btn btn-primary" onClick={onNewTrade}>
              <Plus />
              Log a trade
            </button>
          </div>
        </div>
      ) : (
        <div className="insights-grid">
          <section className="card card-pad span-7">
            <div className="card-head">
              <div>
                <h2 className="card-title">P&amp;L by weekday</h2>
                <p className="card-sub">Net result by the day a trade closed</p>
              </div>
              <span className="chart-legend chart-legend-muted">All closed trades</span>
            </div>
            <div className="weekday-grid">
              {weekdays.map((day) => {
                const intensity = Math.abs(day.net) / maxWeekday
                const background =
                  day.count === 0
                    ? undefined
                    : day.net >= 0
                      ? `rgba(91, 227, 163, ${0.05 + intensity * 0.26})`
                      : `rgba(255, 123, 123, ${0.05 + intensity * 0.26})`
                return (
                  <div
                    key={day.key}
                    className={`weekday-cell ${bestWeekday?.key === day.key && day.net > 0 ? 'is-best' : ''}`}
                    style={{ background }}
                  >
                    <span className="weekday-name">{day.label}</span>
                    <strong className={`tabular ${day.net > 0 ? 'win' : day.net < 0 ? 'loss' : 'flat'}`}>
                      {day.count === 0 ? '—' : formatMoney(day.net, currency, { compact: true, signed: true })}
                    </strong>
                    <span className="weekday-meta">
                      {day.count === 0
                        ? 'no trades'
                        : `${day.count} · ${day.winRate.toFixed(0)}% win`}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="insight-footnote">
              Brightest cells are the days carrying your book. Faded cells are thin sample sizes —
              don’t over-read them.
            </p>
          </section>

          <section className="card card-pad span-5">
            <div className="card-head">
              <div>
                <h2 className="card-title">Return distribution</h2>
                <p className="card-sub">Closed trades bucketed by return %</p>
              </div>
            </div>
            <div className="histogram">
              {histogram.map((bucket) => (
                <div className="hist-col" key={bucket.id} title={`${bucket.label}: ${bucket.count} trades`}>
                  <span className="hist-count tabular">{bucket.count > 0 ? bucket.count : ''}</span>
                  <div className="hist-track">
                    <span
                      className={`hist-bar ${bucket.tone}`}
                      style={{ height: `${Math.max(bucket.count > 0 ? 4 : 0, (bucket.count / maxHistogram) * 100)}%` }}
                    />
                  </div>
                  <span className="hist-label">
                    {bucket.label.replace('%', '').replace(' to ', '–').replace('< ', '<')}
                  </span>
                </div>
              ))}
            </div>
            <p className="insight-footnote">
              A healthy book usually shows a fat right tail and a tight cluster of small losses.
            </p>
          </section>

          <section className="card card-pad span-7">
            <div className="card-head">
              <div>
                <h2 className="card-title">Strategy performance</h2>
                <p className="card-sub">Which setups are actually paying</p>
              </div>
            </div>
            <div className="rank-list">
              {strategies.slice(0, 7).map((item) => (
                <div className="rank-row" key={item.key}>
                  <div className="rank-main">
                    <span className="rank-name">{item.label}</span>
                    <span className="rank-meta">
                      {item.count} {item.count === 1 ? 'trade' : 'trades'} · {item.winRate.toFixed(0)}% win
                    </span>
                    <span className="rank-bar">
                      <span
                        className={item.net < 0 ? 'neg' : ''}
                        style={{ width: `${Math.max(2, (Math.abs(item.net) / maxStrategy) * 100)}%` }}
                      />
                    </span>
                  </div>
                  <span className={`rank-net tabular ${item.net > 0 ? 'win' : item.net < 0 ? 'loss' : 'flat'}`}>
                    {formatMoney(item.net, currency, { signed: true })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card card-pad span-5">
            <div className="card-head">
              <div>
                <h2 className="card-title">Symbol leaderboard</h2>
                <p className="card-sub">Your best and worst instruments</p>
              </div>
            </div>
            <div className="leader-list">
              {symbols.slice(0, 6).map((item) => (
                <div className="leader-row" key={item.key}>
                  <span className="leader-mark">{item.label.slice(0, 2)}</span>
                  <span className="leader-name">
                    {item.label}
                    <span className="leader-meta">
                      {item.count} {item.count === 1 ? 'trade' : 'trades'} · {item.winRate.toFixed(0)}% win
                    </span>
                  </span>
                  <span className={`leader-net tabular ${item.net > 0 ? 'win' : item.net < 0 ? 'loss' : 'flat'}`}>
                    {formatMoney(item.net, currency, { signed: true })}
                    <span className="leader-avg">
                      {formatMoney(item.net / item.count, currency, { signed: true })} avg
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card card-pad span-5">
            <div className="card-head">
              <div>
                <h2 className="card-title">Cost &amp; timing</h2>
                <p className="card-sub">The quiet drag on your returns</p>
              </div>
            </div>
            <div className="metric-list">
              <div className="metric-row">
                <span>Fees paid</span>
                <strong className="tabular">{formatMoney(stats.fees, currency)}</strong>
              </div>
              <div className="metric-row">
                <span>Fee share of gross profit</span>
                <strong className={`tabular ${feeShare > 15 ? 'loss' : ''}`}>{feeShare.toFixed(1)}%</strong>
              </div>
              <div className="metric-row">
                <span>Traded volume</span>
                <strong className="tabular">{formatMoney(stats.volume, currency, { compact: true })}</strong>
              </div>
              <div className="metric-row">
                <span>Average hold</span>
                <strong className="tabular">{stats.avgHold.toFixed(1)} days</strong>
              </div>
              <div className="metric-row">
                <span>Winners held</span>
                <strong className="tabular win">{stats.avgWinHold.toFixed(1)} days</strong>
              </div>
              <div className="metric-row">
                <span>Losers held</span>
                <strong className="tabular loss">{stats.avgLossHold.toFixed(1)} days</strong>
              </div>
              <div className="metric-row">
                <span>Best return</span>
                <strong className="tabular win">
                  {stats.best ? formatPct(tradeResult(stats.best).pct ?? 0) : '—'}
                </strong>
              </div>
              <div className="metric-row">
                <span>Worst return</span>
                <strong className="tabular loss">
                  {stats.worst ? formatPct(tradeResult(stats.worst).pct ?? 0) : '—'}
                </strong>
              </div>
            </div>
          </section>

          <section className="card card-pad span-7">
            <div className="card-head">
              <div>
                <h2 className="card-title">What the numbers say</h2>
                <p className="card-sub">Read-only observations from this period — not trading advice</p>
              </div>
            </div>
            <InsightsList insights={insights} layout="grid" />
          </section>
        </div>
      )}
    </div>
  )
}
