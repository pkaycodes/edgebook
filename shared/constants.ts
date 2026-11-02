export const SESSION_DAYS = 30

export const MARKETS = ['crypto', 'stocks', 'forex'] as const
export type Market = (typeof MARKETS)[number]

export const SIDES = ['long', 'short'] as const
export type Side = (typeof SIDES)[number]

export const TRADE_STATUSES = ['open', 'closed'] as const
export type TradeStatus = (typeof TRADE_STATUSES)[number]

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'ZAR'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

export const STRATEGY_SUGGESTIONS = [
  'Breakout',
  'Pullback',
  'Swing',
  'Scalp',
  'Momentum',
  'Mean reversion',
  'News play',
  'Range',
] as const

export const MARKET_LABELS: Record<Market, string> = {
  crypto: 'Crypto',
  stocks: 'Stocks',
  forex: 'Forex',
}

export const SIDE_LABELS: Record<Side, string> = {
  long: 'Long',
  short: 'Short',
}

export const MAX_TRADES_PER_USER = 5000
