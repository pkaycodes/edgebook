import type { Market, Side } from '../../shared/constants'
import { MARKET_LABELS } from '../../shared/constants'
import type { Trade } from '../../shared/types'
import {
  WEEKDAYS,
  addDays,
  daysBetween,
  formatDate,
  formatShortDate,
  listDays,
  startOfPeriod,
  todayISO,
  weekdayIndex,
  type Period,
} from './dates'
import { formatMoney, formatPct } from './format'

/* ------------------------------ trade math ------------------------------ */

export interface TradeResult {
  notional: number
  gross: number | null
  net: number | null
  pct: number | null
  isClosed: boolean
  hasMark: boolean
  holdDays: number
}

export function tradeResult(trade: Trade): TradeResult {
  const notional = trade.entryPrice * trade.quantity
  const hasExit = trade.exitPrice !== null && Number.isFinite(trade.exitPrice)
  const direction = trade.side === 'long' ? 1 : -1
  const gross = hasExit ? (trade.exitPrice! - trade.entryPrice) * trade.quantity * direction : null
  const net = gross === null ? null : gross - trade.fees
  const pct = net === null || notional === 0 ? null : (net / notional) * 100
  const isClosed = trade.status === 'closed' && hasExit
  const holdDays = trade.exitDate
    ? Math.max(0, daysBetween(trade.entryDate, trade.exitDate))
    : Math.max(0, daysBetween(trade.entryDate, todayISO()))
  return { notional, gross, net, pct, isClosed, hasMark: hasExit, holdDays }
}

export function tradeDate(trade: Trade): string {
  return trade.exitDate ?? trade.entryDate
}

export function sortByDateDesc(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    const left = `${tradeDate(a)}${a.createdAt}`
    const right = `${tradeDate(b)}${b.createdAt}`
    return right.localeCompare(left)
  })
}

export function realizedTrades(trades: Trade[], period: Period): Trade[] {
  const start = startOfPeriod(period)
  return trades
    .filter((trade) => {
      const result = tradeResult(trade)
      if (!result.isClosed) return false
      if (!start) return true
      return tradeDate(trade) >= start
    })
    .sort((a, b) => tradeDate(a).localeCompare(tradeDate(b)))
}

export function openTrades(trades: Trade[]): Trade[] {
  return sortByDateDesc(trades.filter((trade) => trade.status === 'open'))
}

/* -------------------------------- stats --------------------------------- */

export interface SideStats {
  count: number
  wins: number
  net: number
  winRate: number
}

export interface Streak {
  type: 'win' | 'loss'
  count: number
}

export interface Stats {
  count: number
  net: number
  gross: number
  fees: number
  volume: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  profitFactor: number | null
  avgWin: number
  avgLoss: number
  expectancy: number
  payoff: number
  best: Trade | null
  worst: Trade | null
  avgHold: number
  avgWinHold: number
  avgLossHold: number
  longs: SideStats
  shorts: SideStats
  currentStreak: Streak | null
  maxWinStreak: number
  maxLossStreak: number
}

const EMPTY_SIDE: SideStats = { count: 0, wins: 0, net: 0, winRate: 0 }

export function computeStats(closed: Trade[]): Stats {
  const stats: Stats = {
    count: closed.length,
    net: 0,
    gross: 0,
    fees: 0,
    volume: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    winRate: 0,
    profitFactor: null,
    avgWin: 0,
    avgLoss: 0,
    expectancy: 0,
    payoff: 0,
    best: null,
    worst: null,
    avgHold: 0,
    avgWinHold: 0,
    avgLossHold: 0,
    longs: { ...EMPTY_SIDE },
    shorts: { ...EMPTY_SIDE },
    currentStreak: null,
    maxWinStreak: 0,
    maxLossStreak: 0,
  }
  if (closed.length === 0) return stats

  let winSum = 0
  let lossSum = 0
  let holdSum = 0
  let winHoldSum = 0
  let lossHoldSum = 0
  let bestNet = -Infinity
  let worstNet = Infinity
  let winStreak = 0
  let lossStreak = 0

  const sideAcc: Record<Side, SideStats> = {
    long: { ...EMPTY_SIDE },
    short: { ...EMPTY_SIDE },
  }

  for (const trade of closed) {
    const result = tradeResult(trade)
    const net = result.net ?? 0
    stats.net += net
    stats.gross += result.gross ?? 0
    stats.fees += trade.fees
    stats.volume += result.notional
    holdSum += result.holdDays

    const side = sideAcc[trade.side]
    side.count += 1

    if (net > 0.005) {
      stats.wins += 1
      winSum += net
      winHoldSum += result.holdDays
      winStreak += 1
      lossStreak = 0
      side.wins += 1
    } else if (net < -0.005) {
      stats.losses += 1
      lossSum += Math.abs(net)
      lossHoldSum += result.holdDays
      lossStreak += 1
      winStreak = 0
    } else {
      stats.breakeven += 1
      winStreak = 0
      lossStreak = 0
    }

    side.net += net
    stats.maxWinStreak = Math.max(stats.maxWinStreak, winStreak)
    stats.maxLossStreak = Math.max(stats.maxLossStreak, lossStreak)

    if (net > bestNet) {
      bestNet = net
      stats.best = trade
    }
    if (net < worstNet) {
      worstNet = net
      stats.worst = trade
    }
  }

  const decided = stats.wins + stats.losses
  stats.winRate = decided === 0 ? 0 : (stats.wins / decided) * 100
  stats.avgWin = stats.wins === 0 ? 0 : winSum / stats.wins
  stats.avgLoss = stats.losses === 0 ? 0 : lossSum / stats.losses
  stats.expectancy = stats.net / stats.count
  stats.payoff = stats.avgLoss === 0 ? 0 : stats.avgWin / stats.avgLoss
  stats.profitFactor = lossSum === 0 ? (winSum > 0 ? null : 0) : winSum / lossSum
  stats.avgHold = holdSum / stats.count
  stats.avgWinHold = stats.wins === 0 ? 0 : winHoldSum / stats.wins
  stats.avgLossHold = stats.losses === 0 ? 0 : lossHoldSum / stats.losses

  for (const side of ['long', 'short'] as const) {
    const entry = sideAcc[side]
    const sideDecided = entry.count
    entry.winRate = sideDecided === 0 ? 0 : (entry.wins / sideDecided) * 100
  }
  stats.longs = sideAcc.long
  stats.shorts = sideAcc.short

  const last = closed[closed.length - 1]
  if (last) {
    const lastNet = tradeResult(last).net ?? 0
    if (lastNet > 0.005) stats.currentStreak = { type: 'win', count: winStreak }
    else if (lastNet < -0.005) stats.currentStreak = { type: 'loss', count: lossStreak }
  }

  return stats
}

/* ------------------------------ equity curve ---------------------------- */

export interface DayPoint {
  date: string
  value: number
  delta: number
  trades: number
}

export interface EquityPoint extends DayPoint {
  label: string
}

export function buildDailySeries(closed: Trade[], period: Period): DayPoint[] {
  if (closed.length === 0) return []
  const end = todayISO()
  const periodStart = startOfPeriod(period)
  const firstDate = closed[0] ? tradeDate(closed[0]) : end
  const start = periodStart ?? firstDate
  const days = listDays(start, end)
  const byDay = new Map<string, { delta: number; trades: number }>()
  for (const trade of closed) {
    const date = tradeDate(trade)
    const current = byDay.get(date) ?? { delta: 0, trades: 0 }
    current.delta += tradeResult(trade).net ?? 0
    current.trades += 1
    byDay.set(date, current)
  }
  let cumulative = 0
  return days.map((date) => {
    const entry = byDay.get(date)
    const delta = entry?.delta ?? 0
    cumulative += delta
    return { date, delta, value: cumulative, trades: entry?.trades ?? 0 }
  })
}

export function withAnchor(points: DayPoint[]): DayPoint[] {
  if (points.length === 0) return []
  const first = points[0]
  return [
    { date: addDays(first.date, -1), value: 0, delta: 0, trades: 0 },
    ...points,
  ]
}

export function bucketBars(points: DayPoint[], maxBars = 20): EquityPoint[] {
  if (points.length === 0) return []
  if (points.length <= maxBars) {
    return points.map((point) => ({ ...point, label: formatShortDate(point.date) }))
  }
  const size = Math.ceil(points.length / maxBars)
  const buckets: EquityPoint[] = []
  for (let index = 0; index < points.length; index += size) {
    const slice = points.slice(index, index + size)
    const last = slice[slice.length - 1]
    buckets.push({
      date: last.date,
      value: last.value,
      delta: slice.reduce((total, point) => total + point.delta, 0),
      trades: slice.reduce((total, point) => total + point.trades, 0),
      label:
        slice.length > 1
          ? `${formatShortDate(slice[0].date)} – ${formatShortDate(last.date)}`
          : formatShortDate(last.date),
    })
  }
  return buckets
}

export interface Drawdown {
  amount: number
  percent: number | null
  peakDate: string | null
  troughDate: string | null
}

export function maxDrawdown(closed: Trade[]): Drawdown {
  let cumulative = 0
  let peak = 0
  let peakDate: string | null = null
  let worst = 0
  let troughDate: string | null = null
  for (const trade of closed) {
    cumulative += tradeResult(trade).net ?? 0
    if (cumulative > peak) {
      peak = cumulative
      peakDate = tradeDate(trade)
    }
    const drawdown = peak - cumulative
    if (drawdown > worst) {
      worst = drawdown
      troughDate = tradeDate(trade)
    }
  }
  return {
    amount: worst,
    percent: peak > 0 ? (worst / peak) * 100 : null,
    peakDate,
    troughDate,
  }
}

/* ------------------------------ breakdowns ------------------------------ */

export interface Breakdown {
  key: string
  label: string
  count: number
  net: number
  wins: number
  winRate: number
  volume: number
}

function summarize(key: string, label: string, trades: Trade[]): Breakdown {
  let net = 0
  let wins = 0
  let volume = 0
  for (const trade of trades) {
    const result = tradeResult(trade)
    net += result.net ?? 0
    if ((result.net ?? 0) > 0.005) wins += 1
    volume += result.notional
  }
  return {
    key,
    label,
    count: trades.length,
    net,
    wins,
    winRate: trades.length === 0 ? 0 : (wins / trades.length) * 100,
    volume,
  }
}

function group(trades: Trade[], keyOf: (trade: Trade) => string, labelOf: (key: string) => string): Breakdown[] {
  const map = new Map<string, Trade[]>()
  for (const trade of trades) {
    const key = keyOf(trade)
    const list = map.get(key) ?? []
    list.push(trade)
    map.set(key, list)
  }
  return [...map.entries()]
    .map(([key, list]) => summarize(key, labelOf(key), list))
    .sort((a, b) => b.net - a.net)
}

export function byMarket(trades: Trade[]): Breakdown[] {
  return group(
    trades,
    (trade) => trade.market,
    (key) => MARKET_LABELS[key as Market] ?? key,
  )
}

export function byStrategy(trades: Trade[]): Breakdown[] {
  return group(
    trades,
    (trade) => trade.strategy.trim() || 'Unlabelled',
    (key) => key,
  )
}

export function bySymbol(trades: Trade[]): Breakdown[] {
  return group(
    trades,
    (trade) => trade.symbol,
    (key) => key,
  )
}

export function byWeekday(trades: Trade[]): Breakdown[] {
  const buckets: Trade[][] = WEEKDAYS.map(() => [])
  for (const trade of trades) {
    buckets[weekdayIndex(tradeDate(trade))].push(trade)
  }
  return WEEKDAYS.map((label, index) => summarize(label, label, buckets[index]))
}

/* ------------------------------- histogram ------------------------------ */

export interface HistogramBucket {
  id: string
  label: string
  count: number
  tone: 'win' | 'loss'
}

const HISTOGRAM_EDGES = [-4, -2, -1, 0, 1, 2, 4]

export function pnlHistogram(trades: Trade[]): HistogramBucket[] {
  const labels = [
    '< −4%',
    '−4 to −2%',
    '−2 to −1%',
    '−1 to 0%',
    '0 to 1%',
    '1 to 2%',
    '2 to 4%',
    '> 4%',
  ]
  const counts = labels.map(() => 0)
  for (const trade of trades) {
    const pct = tradeResult(trade).pct
    if (pct === null) continue
    let index = HISTOGRAM_EDGES.findIndex((edge) => pct < edge)
    if (index === -1) index = labels.length - 1
    counts[index] += 1
  }
  return labels.map((label, index) => ({
    id: label,
    label,
    count: counts[index],
    tone: index < 4 ? 'loss' : 'win',
  }))
}

/* -------------------------------- insights ------------------------------ */

export type InsightIcon =
  | 'strategy'
  | 'fees'
  | 'calendar'
  | 'side'
  | 'streak'
  | 'hold'
  | 'trophy'
  | 'drawdown'
  | 'symbol'
  | 'expectancy'

export interface Insight {
  id: string
  icon: InsightIcon
  tone: 'good' | 'bad' | 'neutral'
  title: string
  body: string
}

export function buildInsights(
  trades: Trade[],
  stats: Stats,
  currency: string,
): Insight[] {
  const insights: Insight[] = []
  if (trades.length < 3) return insights

  const strategies = byStrategy(trades).filter((item) => item.count >= 3)
  const bestStrategy = strategies[0]
  if (bestStrategy && bestStrategy.net > 0) {
    insights.push({
      id: 'strategy',
      icon: 'strategy',
      tone: 'good',
      title: `${bestStrategy.label} is doing the heavy lifting`,
      body: `${formatMoney(bestStrategy.net, currency)} net across ${bestStrategy.count} trades · ${bestStrategy.winRate.toFixed(0)}% win rate.`,
    })
  }

  const grossProfit = trades.reduce((total, trade) => {
    const net = tradeResult(trade).net ?? 0
    return net > 0 ? total + net : total
  }, 0)
  if (stats.fees > 0 && grossProfit > 0) {
    const share = (stats.fees / grossProfit) * 100
    insights.push({
      id: 'fees',
      icon: 'fees',
      tone: share > 12 ? 'bad' : 'neutral',
      title: `Fees are taking ${share.toFixed(1)}% of gross profit`,
      body: `${formatMoney(stats.fees, currency)} paid in fees across ${stats.count} closed trades.`,
    })
  }

  const weekdays = byWeekday(trades).filter((item) => item.count >= 2)
  const bestDay = [...weekdays].sort((a, b) => b.net - a.net)[0]
  const worstDay = [...weekdays].sort((a, b) => a.net - b.net)[0]
  if (bestDay && bestDay.net > 0) {
    insights.push({
      id: 'weekday',
      icon: 'calendar',
      tone: 'good',
      title: `${bestDay.label} is your strongest day`,
      body: `${formatMoney(bestDay.net, currency)} net from ${bestDay.count} trades${
        worstDay && worstDay.net < 0
          ? ` · ${worstDay.label} is your weakest (${formatMoney(worstDay.net, currency)})`
          : ''
      }.`,
    })
  }

  if (stats.longs.count >= 3 && stats.shorts.count >= 3) {
    const gap = stats.longs.winRate - stats.shorts.winRate
    if (Math.abs(gap) >= 8) {
      const stronger = gap > 0 ? stats.longs : stats.shorts
      const weaker = gap > 0 ? stats.shorts : stats.longs
      const strongerLabel = gap > 0 ? 'Longs' : 'Shorts'
      insights.push({
        id: 'side',
        icon: 'side',
        tone: 'neutral',
        title: `${strongerLabel} are your stronger side`,
        body: `${strongerLabel} win ${stronger.winRate.toFixed(0)}% (${formatMoney(stronger.net, currency)}) versus ${weaker.winRate.toFixed(0)}% for ${gap > 0 ? 'shorts' : 'longs'} (${formatMoney(weaker.net, currency)}).`,
      })
    }
  }

  if (stats.currentStreak && stats.currentStreak.count >= 3) {
    const isWin = stats.currentStreak.type === 'win'
    insights.push({
      id: 'streak',
      icon: 'streak',
      tone: isWin ? 'good' : 'bad',
      title: `You are on a ${stats.currentStreak.count}-${stats.currentStreak.type} run`,
      body: isWin
        ? 'Momentum is with you — keep position sizing consistent.'
        : 'After three straight losses, cut size and re-check the setup.',
    })
  } else if (stats.maxLossStreak >= 3) {
    insights.push({
      id: 'streak',
      icon: 'streak',
      tone: 'bad',
      title: `Your longest losing streak was ${stats.maxLossStreak} trades`,
      body: 'A fixed risk cap would soften runs like this.',
    })
  }

  if (stats.wins >= 3 && stats.losses >= 3) {
    if (stats.avgWinHold > stats.avgLossHold + 0.4) {
      insights.push({
        id: 'hold',
        icon: 'hold',
        tone: 'neutral',
        title: 'You give winners more room than losers',
        body: `Winners average ${stats.avgWinHold.toFixed(1)} days versus ${stats.avgLossHold.toFixed(1)} for losers.`,
      })
    } else if (stats.avgLossHold > stats.avgWinHold + 0.4) {
      insights.push({
        id: 'hold',
        icon: 'hold',
        tone: 'bad',
        title: 'Losers are being held longer than winners',
        body: `Losers hang around for ${stats.avgLossHold.toFixed(1)} days on average; winners only ${stats.avgWinHold.toFixed(1)}.`,
      })
    }
  }

  if (stats.best && stats.worst) {
    const bestResult = tradeResult(stats.best)
    const worstResult = tradeResult(stats.worst)
    insights.push({
      id: 'trophy',
      icon: 'trophy',
      tone: 'good',
      title: `Biggest win: ${stats.best.symbol}`,
      body: `${formatMoney(bestResult.net ?? 0, currency, { signed: true })} on ${formatDate(tradeDate(stats.best), { year: false })}. Worst: ${stats.worst.symbol} ${formatMoney(worstResult.net ?? 0, currency, { signed: true })}.`,
    })
  }

  const drawdown = maxDrawdown(trades)
  if (drawdown.amount > 0) {
    insights.push({
      id: 'drawdown',
      icon: 'drawdown',
      tone: 'bad',
      title: `Max drawdown: ${formatMoney(drawdown.amount, currency)}`,
      body: `Peak to trough from ${drawdown.peakDate ? formatDate(drawdown.peakDate, { year: false }) : 'the high'} to ${drawdown.troughDate ? formatDate(drawdown.troughDate, { year: false }) : 'the low'}.`,
    })
  }

  const symbols = bySymbol(trades)
  const totalVolume = symbols.reduce((total, item) => total + item.volume, 0)
  if (symbols.length >= 2 && totalVolume > 0) {
    const top = [...symbols].sort((a, b) => b.volume - a.volume)[0]
    const share = (top.volume / totalVolume) * 100
    if (share >= 35) {
      insights.push({
        id: 'symbol',
        icon: 'symbol',
        tone: share >= 60 ? 'bad' : 'neutral',
        title: `${top.label} is ${share.toFixed(0)}% of your volume`,
        body: `Concentration is ${share >= 60 ? 'high' : 'worth watching'} — one symbol is driving most of your exposure.`,
      })
    }
  }

  if (stats.count >= 5 && stats.expectancy !== 0) {
    insights.push({
      id: 'expectancy',
      icon: 'expectancy',
      tone: stats.expectancy > 0 ? 'good' : 'bad',
      title: `${formatMoney(stats.expectancy, currency, { signed: true })} expectancy per trade`,
      body: `Average result across ${stats.count} closed trades. Payoff ratio is ${stats.payoff ? stats.payoff.toFixed(2) : '—'}.`,
    })
  }

  return insights
}

/* -------------------------------- helpers ------------------------------- */

export function bestAndWorstDay(points: DayPoint[]): {
  best: DayPoint | null
  worst: DayPoint | null
} {
  let best: DayPoint | null = null
  let worst: DayPoint | null = null
  for (const point of points) {
    if (point.trades === 0) continue
    if (!best || point.delta > best.delta) best = point
    if (!worst || point.delta < worst.delta) worst = point
  }
  return { best, worst }
}

export function pnlTone(value: number): 'win' | 'loss' | 'flat' {
  if (value > 0.005) return 'win'
  if (value < -0.005) return 'loss'
  return 'flat'
}

export function pnlText(value: number, currency: string, options: { signed?: boolean } = {}): string {
  return formatMoney(value, currency, { signed: options.signed ?? true })
}

export function pctText(value: number | null): string {
  return value === null ? '—' : formatPct(value)
}
