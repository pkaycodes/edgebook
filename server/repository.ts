import type { Market, Side, TradeStatus } from '../shared/constants'
import type { Trade, User } from '../shared/types'
import type { SessionUser } from './auth'
import { db, nowISO } from './db'

export interface TradeRow {
  id: string
  user_id: string
  symbol: string
  market: Market
  side: Side
  status: TradeStatus
  entry_price: number
  exit_price: number | null
  quantity: number
  fees: number
  entry_date: string
  exit_date: string | null
  strategy: string
  notes: string
  created_at: string
  updated_at: string
}

export interface SettingsRow {
  user_id: string
  currency: string
  created_at: string
}

export function serializeTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    symbol: row.symbol,
    market: row.market,
    side: row.side,
    status: row.status,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    quantity: row.quantity,
    fees: row.fees,
    entryDate: row.entry_date,
    exitDate: row.exit_date,
    strategy: row.strategy,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function serializeUser(user: SessionUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isDemo: user.is_demo === 1,
    createdAt: user.created_at,
  }
}

export function ensureSettings(userId: string): SettingsRow {
  const existing = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId) as
    | SettingsRow
    | undefined
  if (existing) return existing
  const createdAt = nowISO()
  db.prepare('INSERT INTO settings (user_id, currency, created_at) VALUES (?, ?, ?)').run(
    userId,
    'USD',
    createdAt,
  )
  return { user_id: userId, currency: 'USD', created_at: createdAt }
}
