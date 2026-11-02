import type { Trade } from '../../shared/types'
import { tradeResult } from './analytics'
import { todayISO } from './dates'

function escapeCell(value: string | number | null): string {
  if (value === null) return ''
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function exportTradesCsv(trades: Trade[]): void {
  const header = [
    'Symbol',
    'Market',
    'Side',
    'Status',
    'Entry price',
    'Exit price',
    'Quantity',
    'Fees',
    'Entry date',
    'Exit date',
    'Strategy',
    'Net P&L',
    'Return %',
    'Notes',
  ]

  const rows = trades.map((trade) => {
    const result = tradeResult(trade)
    return [
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
      result.net === null ? null : result.net.toFixed(2),
      result.pct === null ? null : result.pct.toFixed(2),
      trade.notes,
    ]
  })

  const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `edgebook-trades-${todayISO()}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
