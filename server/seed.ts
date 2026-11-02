import { hashPassword } from './auth'
import { db, newId, nowISO } from './db'
import type { Market } from '../shared/constants'

interface SeedSymbol {
  symbol: string
  market: Market
  price: number
  volatility: number
  quantity: [number, number]
  decimals: number
  strategies: string[]
}

const SYMBOLS: SeedSymbol[] = [
  {
    symbol: 'BTC/USDT',
    market: 'crypto',
    price: 96500,
    volatility: 0.035,
    quantity: [0.08, 0.32],
    decimals: 2,
    strategies: ['Breakout', 'Swing', 'Momentum', 'Range'],
  },
  {
    symbol: 'ETH/USDT',
    market: 'crypto',
    price: 3380,
    volatility: 0.045,
    quantity: [0.8, 3.4],
    decimals: 2,
    strategies: ['Breakout', 'Pullback', 'Swing'],
  },
  {
    symbol: 'SOL/USDT',
    market: 'crypto',
    price: 188,
    volatility: 0.06,
    quantity: [9, 40],
    decimals: 3,
    strategies: ['Momentum', 'Scalp', 'Breakout'],
  },
  {
    symbol: 'NVDA',
    market: 'stocks',
    price: 142,
    volatility: 0.03,
    quantity: [18, 70],
    decimals: 2,
    strategies: ['Breakout', 'Momentum', 'News play'],
  },
  {
    symbol: 'AAPL',
    market: 'stocks',
    price: 231,
    volatility: 0.018,
    quantity: [12, 48],
    decimals: 2,
    strategies: ['Pullback', 'Swing'],
  },
  {
    symbol: 'TSLA',
    market: 'stocks',
    price: 344,
    volatility: 0.04,
    quantity: [8, 32],
    decimals: 2,
    strategies: ['Momentum', 'Scalp', 'News play'],
  },
  {
    symbol: 'EUR/USD',
    market: 'forex',
    price: 1.085,
    volatility: 0.006,
    quantity: [8000, 24000],
    decimals: 5,
    strategies: ['Range', 'News play', 'Scalp'],
  },
  {
    symbol: 'GBP/USD',
    market: 'forex',
    price: 1.269,
    volatility: 0.007,
    quantity: [8000, 20000],
    decimals: 5,
    strategies: ['Range', 'Breakout'],
  },
  {
    symbol: 'XAU/USD',
    market: 'forex',
    price: 2668,
    volatility: 0.012,
    quantity: [1.5, 6],
    decimals: 2,
    strategies: ['Swing', 'Breakout', 'News play'],
  },
]

const NOTES: Record<string, string[]> = {
  crypto: [
    'Clean break of the overnight range, took partials into the extension.',
    'Entered on the retest, trailed the stop under structure.',
    'Chased the move a little — entry was late, size was right.',
    'Funding was elevated, kept the hold short.',
    'Daily trend aligned with the 4h setup.',
  ],
  stocks: [
    'Opening range breakout with volume confirmation.',
    'Bought the pullback to the 20 EMA, sold into resistance.',
    'Earnings drift play, kept risk tight.',
    'Momentum faded faster than expected.',
    'Scaled in on the second push.',
  ],
  forex: [
    'London session range fade, textbook setup.',
    'News spike gave a clean liquidity sweep.',
    'Trend day — held through the New York open.',
    'Stop was too tight for the session volatility.',
    'Took the Asian range breakout into London.',
  ],
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isoDaysAgo(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]
}

interface GeneratedTrade {
  symbol: string
  market: Market
  side: 'long' | 'short'
  status: 'open' | 'closed'
  entryPrice: number
  exitPrice: number | null
  quantity: number
  fees: number
  entryDate: string
  exitDate: string | null
  strategy: string
  notes: string
}

export function generateTrades(count = 46, seed = 20261030): GeneratedTrade[] {
  const rng = mulberry32(seed)
  const trades: GeneratedTrade[] = []

  const winChance: Record<string, number> = {
    Breakout: 0.69,
    Pullback: 0.64,
    Momentum: 0.6,
    Swing: 0.57,
    'Mean reversion': 0.55,
    Range: 0.53,
    'News play': 0.5,
    Scalp: 0.47,
  }

  for (let i = 0; i < count; i += 1) {
    const meta = pick(rng, SYMBOLS)
    const side = rng() < 0.62 ? 'long' : 'short'
    const direction = side === 'long' ? 1 : -1
    const strategy = pick(rng, meta.strategies)

    const entryPrice = round(
      meta.price * (1 + (rng() - 0.5) * meta.volatility * 3),
      meta.decimals,
    )
    const quantity =
      meta.market === 'stocks'
        ? Math.round(meta.quantity[0] + rng() * (meta.quantity[1] - meta.quantity[0]))
        : round(meta.quantity[0] + rng() * (meta.quantity[1] - meta.quantity[0]), 3)

    const isWinner = rng() < (winChance[strategy] ?? 0.58)
    const movePct =
      (isWinner ? 0.008 + rng() * 0.03 : 0.004 + rng() * 0.015) * (isWinner ? 1 : -1)
    const exitPrice = round(entryPrice * (1 + direction * movePct), meta.decimals)

    const notional = entryPrice * quantity
    const fees =
      meta.market === 'crypto'
        ? round(notional * 0.0016, 2)
        : meta.market === 'stocks'
          ? round(1.5 + rng() * 3.5, 2)
          : round(2 + rng() * 4, 2)

    const hold = Math.floor(rng() * 5)
    const span = 90
    const base = 93 - Math.floor((i / Math.max(1, count)) * span)
    const jitter = Math.floor(rng() * 3) - 1
    const entryDay = Math.min(94, Math.max(4, base + jitter))
    const exitDay = Math.max(1, entryDay - hold)

    trades.push({
      symbol: meta.symbol,
      market: meta.market,
      side,
      status: 'closed',
      entryPrice,
      exitPrice,
      quantity,
      fees,
      entryDate: isoDaysAgo(entryDay),
      exitDate: isoDaysAgo(exitDay),
      strategy,
      notes: pick(rng, NOTES[meta.market]),
    })
  }

  // A few live positions near the end of the window.
  const openPlans: Array<[string, 'long' | 'short']> = [
    ['BTC/USDT', 'long'],
    ['NVDA', 'long'],
    ['EUR/USD', 'short'],
  ]
  for (const [symbol, side] of openPlans) {
    const meta = SYMBOLS.find((entry) => entry.symbol === symbol)!
    const direction = side === 'long' ? 1 : -1
    const entryPrice = round(
      meta.price * (1 + (rng() - 0.5) * meta.volatility * 2),
      meta.decimals,
    )
    const quantity =
      meta.market === 'stocks'
        ? Math.round(meta.quantity[0] + rng() * (meta.quantity[1] - meta.quantity[0]))
        : round(meta.quantity[0] + rng() * (meta.quantity[1] - meta.quantity[0]), 3)
    const markPrice = round(
      entryPrice * (1 + direction * (0.004 + rng() * 0.018)),
      meta.decimals,
    )
    const notional = entryPrice * quantity
    trades.push({
      symbol,
      market: meta.market,
      side,
      status: 'open',
      entryPrice,
      exitPrice: markPrice,
      quantity,
      fees:
        meta.market === 'crypto'
          ? round(notional * 0.0008, 2)
          : meta.market === 'stocks'
            ? round(1.5 + rng() * 2, 2)
            : round(2 + rng() * 2, 2),
      entryDate: isoDaysAgo(3 + Math.floor(rng() * 5)),
      exitDate: null,
      strategy: pick(rng, meta.strategies),
      notes: 'Still open — mark price updated manually.',
    })
  }

  return trades
}

export function insertTrades(userId: string, trades: GeneratedTrade[]): void {
  const statement = db.prepare(
    `INSERT INTO trades (
      id, user_id, symbol, market, side, status, entry_price, exit_price,
      quantity, fees, entry_date, exit_date, strategy, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const timestamp = nowISO()
  for (const trade of trades) {
    statement.run(
      newId(),
      userId,
      trade.symbol,
      trade.market,
      trade.side,
      trade.status,
      trade.entryPrice,
      trade.exitPrice,
      trade.quantity,
      trade.fees,
      trade.entryDate,
      trade.exitDate,
      trade.strategy,
      trade.notes,
      timestamp,
      timestamp,
    )
  }
}

export function seedSampleTrades(userId: string): number {
  const trades = generateTrades()
  insertTrades(userId, trades)
  return trades.length
}

export async function createDemoUser(): Promise<{ userId: string }> {
  const userId = newId()
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const passwordHash = await hashPassword(`demo-${suffix}-${Math.random().toString(36)}`)
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, is_demo, created_at) VALUES (?, ?, ?, ?, 1, ?)',
  ).run(userId, `demo-${suffix}@edgebook.local`, 'Demo Trader', passwordHash, nowISO())
  db.prepare('INSERT INTO settings (user_id, currency, created_at) VALUES (?, ?, ?)').run(
    userId,
    'USD',
    nowISO(),
  )
  seedSampleTrades(userId)
  return { userId }
}

export function cleanupDemoUsers(): void {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  db.prepare('DELETE FROM users WHERE is_demo = 1 AND created_at < ?').run(cutoff)
}
