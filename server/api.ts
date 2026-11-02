import { Router } from 'express'
import {
  CURRENCIES,
  MARKETS,
  MAX_TRADES_PER_USER,
  SIDES,
  TRADE_STATUSES,
  type CurrencyCode,
} from '../shared/constants'
import type { Settings, Trade } from '../shared/types'
import {
  clearSessionCookie,
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  rateLimitAuth,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from './auth'
import { db, newId, nowISO } from './db'
import {
  ensureSettings,
  serializeTrade,
  serializeUser,
  type SettingsRow,
  type TradeRow,
} from './repository'
import { cleanupDemoUsers, createDemoUser, seedSampleTrades } from './seed'
import {
  HttpError,
  asObject,
  email,
  isoDate,
  money,
  number,
  oneOf,
  password,
  text,
} from './validate'

export const api = Router()

function settingsPayload(row: SettingsRow): Settings {
  return { currency: row.currency as CurrencyCode }
}

function sessionPayload(userId: string) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | Parameters<typeof serializeUser>[0]
    | undefined
  if (!user) throw new HttpError(401, 'Your session has expired. Please sign in again.')
  return {
    user: serializeUser(user),
    settings: settingsPayload(ensureSettings(userId)),
  }
}

function findTrade(userId: string, tradeId: string): TradeRow {
  const trade = db
    .prepare('SELECT * FROM trades WHERE id = ? AND user_id = ?')
    .get(tradeId, userId) as TradeRow | undefined
  if (!trade) throw new HttpError(404, 'That trade could not be found.')
  return trade
}

function normalizeSymbol(value: unknown): string {
  const symbol = text(value, 'Symbol', { min: 1, max: 20 }).toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9/._:-]*$/.test(symbol)) {
    throw new HttpError(400, 'Use a symbol like BTC/USDT, NVDA or EUR/USD.')
  }
  return symbol
}

interface TradeValues {
  symbol: string
  market: Trade['market']
  side: Trade['side']
  status: Trade['status']
  entryPrice: number
  exitPrice: number | null
  quantity: number
  fees: number
  entryDate: string
  exitDate: string | null
  strategy: string
  notes: string
}

function parseTrade(raw: unknown, existing?: TradeRow): TradeValues {
  const body = asObject(raw)
  const merged = {
    symbol: body.symbol ?? existing?.symbol,
    market: body.market ?? existing?.market,
    side: body.side ?? existing?.side,
    status: body.status ?? existing?.status,
    entryPrice: body.entryPrice ?? existing?.entry_price,
    exitPrice: body.exitPrice !== undefined ? body.exitPrice : existing?.exit_price,
    quantity: body.quantity ?? existing?.quantity,
    fees: body.fees ?? existing?.fees,
    entryDate: body.entryDate ?? existing?.entry_date,
    exitDate: body.exitDate !== undefined ? body.exitDate : existing?.exit_date,
    strategy: body.strategy ?? existing?.strategy,
    notes: body.notes ?? existing?.notes,
  }

  const status = oneOf(merged.status, TRADE_STATUSES, 'trade status')
  const entryPrice = number(merged.entryPrice, 'Entry price', { min: 0.00000001, max: 1e12 })
  const quantity = number(merged.quantity, 'Quantity', { min: 0.00000001, max: 1e12 })
  const fees = number(merged.fees, 'Fees', { min: 0, max: 1e9 })
  const entryDate = isoDate(merged.entryDate, 'Entry date')

  let exitPrice: number | null = null
  if (merged.exitPrice !== undefined && merged.exitPrice !== null && merged.exitPrice !== '') {
    exitPrice = number(merged.exitPrice, 'Exit price', { min: 0.00000001, max: 1e12 })
  }
  let exitDate: string | null = null
  if (merged.exitDate !== undefined && merged.exitDate !== null && merged.exitDate !== '') {
    exitDate = isoDate(merged.exitDate, 'Exit date')
  }

  if (status === 'closed') {
    if (exitPrice === null) throw new HttpError(400, 'Add an exit price to close the trade.')
    if (exitDate === null) throw new HttpError(400, 'Add an exit date to close the trade.')
    if (exitDate < entryDate) {
      throw new HttpError(400, 'The exit date cannot be before the entry date.')
    }
  } else {
    exitDate = null
  }

  const strategy = text(merged.strategy, 'Strategy', {
    optional: true,
    max: 40,
    fallback: '',
  })
  const notes = text(merged.notes, 'Notes', { optional: true, max: 1000, fallback: '' })

  return {
    symbol: normalizeSymbol(merged.symbol),
    market: oneOf(merged.market, MARKETS, 'market'),
    side: oneOf(merged.side, SIDES, 'direction'),
    status,
    entryPrice: money(entryPrice),
    exitPrice: exitPrice === null ? null : money(exitPrice),
    quantity,
    fees: money(fees),
    entryDate,
    exitDate,
    strategy,
    notes,
  }
}

/* -------------------------------- auth ---------------------------------- */

api.post('/auth/register', rateLimitAuth, async (req, res) => {
  const body = asObject(req.body)
  const name = text(body.name, 'Name', { min: 2, max: 60 })
  const address = email(body.email)
  const secret = password(body.password)

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(address)
  if (existing) throw new HttpError(409, 'An account with that email already exists.')

  const userId = newId()
  const createdAt = nowISO()
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, is_demo, created_at) VALUES (?, ?, ?, ?, 0, ?)',
  ).run(userId, address, name, await hashPassword(secret), createdAt)
  ensureSettings(userId)
  setSessionCookie(res, createSession(userId))
  res.status(201).json(sessionPayload(userId))
})

api.post('/auth/login', rateLimitAuth, async (req, res) => {
  const body = asObject(req.body)
  const address = email(body.email)
  const secret = typeof body.password === 'string' ? body.password : ''
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(address) as
    | { id: string; password_hash: string }
    | undefined
  if (!user || !(await verifyPassword(secret, user.password_hash))) {
    throw new HttpError(401, 'That email and password combination did not work.')
  }
  setSessionCookie(res, createSession(user.id))
  res.json(sessionPayload(user.id))
})

api.post('/auth/demo', rateLimitAuth, async (_req, res) => {
  cleanupDemoUsers()
  const { userId } = await createDemoUser()
  setSessionCookie(res, createSession(userId))
  res.status(201).json(sessionPayload(userId))
})

api.post('/auth/logout', (req, res) => {
  destroySession(req.cookies?.edgebook_session)
  clearSessionCookie(res)
  res.json({ ok: true })
})

api.get('/auth/me', requireAuth, (_req, res) => {
  const user = currentUser(res)
  res.json(sessionPayload(user.id))
})

api.patch('/auth/profile', requireAuth, (req, res) => {
  const body = asObject(req.body)
  const name = text(body.name, 'Name', { min: 2, max: 60 })
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, currentUser(res).id)
  res.json(sessionPayload(currentUser(res).id))
})

api.put('/settings', requireAuth, (req, res) => {
  const body = asObject(req.body)
  const currency = oneOf(body.currency, CURRENCIES, 'currency')
  ensureSettings(currentUser(res).id)
  db.prepare('UPDATE settings SET currency = ? WHERE user_id = ?').run(
    currency,
    currentUser(res).id,
  )
  res.json({ currency })
})

api.delete('/account', requireAuth, (_req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(currentUser(res).id)
  clearSessionCookie(res)
  res.json({ ok: true })
})

/* -------------------------------- trades -------------------------------- */

api.get('/trades', requireAuth, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM trades
       WHERE user_id = ?
       ORDER BY COALESCE(exit_date, entry_date) DESC, created_at DESC`,
    )
    .all(currentUser(res).id) as unknown as TradeRow[]
  res.json({ trades: rows.map(serializeTrade) })
})

api.post('/trades', requireAuth, (req, res) => {
  const userId = currentUser(res).id
  const count = db.prepare('SELECT COUNT(*) AS count FROM trades WHERE user_id = ?').get(userId) as {
    count: number
  }
  if (count.count >= MAX_TRADES_PER_USER) {
    throw new HttpError(400, 'You have reached the 5,000 trade limit for one account.')
  }
  const values = parseTrade(req.body)
  const id = newId()
  const timestamp = nowISO()
  db.prepare(
    `INSERT INTO trades (
      id, user_id, symbol, market, side, status, entry_price, exit_price,
      quantity, fees, entry_date, exit_date, strategy, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    values.symbol,
    values.market,
    values.side,
    values.status,
    values.entryPrice,
    values.exitPrice,
    values.quantity,
    values.fees,
    values.entryDate,
    values.exitDate,
    values.strategy,
    values.notes,
    timestamp,
    timestamp,
  )
  res.status(201).json({ trade: serializeTrade(findTrade(userId, id)) })
})

api.patch('/trades/:id', requireAuth, (req, res) => {
  const userId = currentUser(res).id
  const existing = findTrade(userId, String(req.params.id))
  const values = parseTrade(req.body, existing)
  db.prepare(
    `UPDATE trades SET
      symbol = ?, market = ?, side = ?, status = ?, entry_price = ?, exit_price = ?,
      quantity = ?, fees = ?, entry_date = ?, exit_date = ?, strategy = ?, notes = ?,
      updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    values.symbol,
    values.market,
    values.side,
    values.status,
    values.entryPrice,
    values.exitPrice,
    values.quantity,
    values.fees,
    values.entryDate,
    values.exitDate,
    values.strategy,
    values.notes,
    nowISO(),
    existing.id,
    userId,
  )
  res.json({ trade: serializeTrade(findTrade(userId, existing.id)) })
})

api.delete('/trades/:id', requireAuth, (req, res) => {
  const userId = currentUser(res).id
  db.prepare('DELETE FROM trades WHERE id = ? AND user_id = ?').run(String(req.params.id), userId)
  res.json({ ok: true })
})

api.delete('/trades', requireAuth, (_req, res) => {
  db.prepare('DELETE FROM trades WHERE user_id = ?').run(currentUser(res).id)
  res.json({ ok: true })
})

api.post('/trades/sample', requireAuth, (_req, res) => {
  const userId = currentUser(res).id
  const count = db.prepare('SELECT COUNT(*) AS count FROM trades WHERE user_id = ?').get(userId) as {
    count: number
  }
  if (count.count > 0) {
    throw new HttpError(400, 'Clear your ledger before loading sample trades.')
  }
  const inserted = seedSampleTrades(userId)
  const rows = db
    .prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY entry_date DESC')
    .all(userId) as unknown as TradeRow[]
  res.status(201).json({ inserted, trades: rows.map(serializeTrade) })
})
