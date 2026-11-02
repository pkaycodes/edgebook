import type { CurrencyCode, Market, Side, TradeStatus } from './constants'

export interface User {
  id: string
  name: string
  email: string
  isDemo: boolean
  createdAt: string
}

export interface Settings {
  currency: CurrencyCode
}

export interface Trade {
  id: string
  symbol: string
  market: Market
  side: Side
  status: TradeStatus
  entryPrice: number
  exitPrice: number | null
  quantity: number
  fees: number
  entryDate: string
  exitDate: string | null
  strategy: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface SessionPayload {
  user: User
  settings: Settings
}
