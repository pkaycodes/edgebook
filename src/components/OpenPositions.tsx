import { CircleDollarSign } from 'lucide-react'
import type { Trade } from '../../shared/types'
import { tradeResult } from '../lib/analytics'
import { formatMoney, formatPct } from '../lib/format'

interface OpenPositionsProps {
  trades: Trade[]
  currency: string
  onEdit: (trade: Trade) => void
}

function tickerMark(symbol: string): string {
  return symbol.replace(/[/:.]/g, '').slice(0, 2).toUpperCase()
}

export function OpenPositions({ trades, currency, onEdit }: OpenPositionsProps) {
  if (trades.length === 0) {
    return (
      <div className="open-empty">
        <span className="empty-icon">
          <CircleDollarSign />
        </span>
        <strong>No open positions</strong>
        <span>Flat is a position too. New trades will show up here.</span>
      </div>
    )
  }

  return (
    <div className="open-list">
      {trades.map((trade) => {
        const result = tradeResult(trade)
        const net = result.net
        const tone = net === null ? 'flat' : net > 0 ? 'win' : net < 0 ? 'loss' : 'flat'
        return (
          <button type="button" className="open-row" key={trade.id} onClick={() => onEdit(trade)}>
            <span className={`ticker-mark ${trade.market}`}>{tickerMark(trade.symbol)}</span>
            <span className="open-info">
              <span className="open-top">
                <strong>{trade.symbol}</strong>
                <span className={`badge badge-${trade.side}`}>{trade.side}</span>
              </span>
              <span className="open-prices tabular">
                {formatMoney(trade.entryPrice, currency, {
                  decimals: trade.market === 'forex' ? 4 : 2,
                })}
                <span className="arrow">→</span>
                {trade.exitPrice === null
                  ? 'no mark'
                  : formatMoney(trade.exitPrice, currency, {
                      decimals: trade.market === 'forex' ? 4 : 2,
                    })}
              </span>
            </span>
            <span className={`open-pnl ${tone}`}>
              <strong className="tabular">
                {net === null ? '—' : formatMoney(net, currency, { signed: true })}
              </strong>
              <span className="tabular">{result.pct === null ? 'update mark' : formatPct(result.pct)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
