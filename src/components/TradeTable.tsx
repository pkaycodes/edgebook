import { Pencil, Trash2 } from 'lucide-react'
import type { Trade } from '../../shared/types'
import { tradeResult } from '../lib/analytics'
import { formatShortDate } from '../lib/dates'
import { formatMoney, formatPct, formatQuantity } from '../lib/format'

interface TradeTableProps {
  trades: Trade[]
  currency: string
  onEdit: (trade: Trade) => void
  onDelete?: (trade: Trade) => void
  compact?: boolean
}

function tickerMark(symbol: string): string {
  return symbol.replace(/[/:.]/g, '').slice(0, 2).toUpperCase()
}

export function TradeTable({ trades, currency, onEdit, onDelete, compact = false }: TradeTableProps) {
  return (
    <div className={`table-wrap ${compact ? 'table-compact' : ''}`}>
      <table className="table">
        <thead>
          <tr>
            <th>Trade</th>
            <th>Side</th>
            {compact ? null : <th>Status</th>}
            <th>Entry / Exit</th>
            {compact ? null : <th className="num">Qty</th>}
            <th className="num">Net P&amp;L</th>
            {compact ? null : <th className="num">Fees</th>}
            {compact ? null : <th>Strategy</th>}
            <th className="cell-actions" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const result = tradeResult(trade)
            const net = result.net
            const pnlClass = net === null ? 'flat' : net > 0.005 ? 'win' : net < -0.005 ? 'loss' : 'flat'
            return (
              <tr key={trade.id} onClick={() => onEdit(trade)} className="trade-row">
                <td>
                  <div className="symbol-cell">
                    <span className={`ticker-mark ${trade.market}`}>{tickerMark(trade.symbol)}</span>
                    <span>
                      <span className="symbol-name">{trade.symbol}</span>
                      <span className="symbol-date">
                        {compact ? formatShortDate(trade.exitDate ?? trade.entryDate) : trade.market}
                      </span>
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${trade.side}`}>{trade.side === 'long' ? 'Long' : 'Short'}</span>
                </td>
                {compact ? null : (
                  <td>
                    <span className={`badge ${trade.status === 'open' ? 'badge-open' : 'badge-closed'}`}>
                      {trade.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>
                )}
                <td>
                  <span className="price-stack">
                    <span className="tabular">
                      {formatMoney(trade.entryPrice, currency, { decimals: trade.market === 'forex' ? 4 : 2 })}
                      <span className="arrow">→</span>
                      {trade.exitPrice === null
                        ? '—'
                        : formatMoney(trade.exitPrice, currency, { decimals: trade.market === 'forex' ? 4 : 2 })}
                    </span>
                    <span className="price-date">
                      {formatShortDate(trade.entryDate)}
                      {trade.exitDate ? ` → ${formatShortDate(trade.exitDate)}` : ' · open'}
                    </span>
                  </span>
                </td>
                {compact ? null : (
                  <td className="num tabular">{formatQuantity(trade.quantity)}</td>
                )}
                <td className={`num ${pnlClass}`}>
                  <span className="pnl-cell">
                    <strong className="tabular">
                      {net === null ? '—' : formatMoney(net, currency, { signed: true })}
                    </strong>
                    <span className="pnl-pct tabular">
                      {trade.status === 'open' && result.hasMark ? 'unrealized ' : ''}
                      {result.pct === null ? '' : formatPct(result.pct)}
                    </span>
                  </span>
                </td>
                {compact ? null : (
                  <td className="num tabular cell-muted">
                    {formatMoney(trade.fees, currency)}
                  </td>
                )}
                {compact ? null : (
                  <td>
                    {trade.strategy ? (
                      <span className="strategy-pill">{trade.strategy}</span>
                    ) : (
                      <span className="faint">—</span>
                    )}
                  </td>
                )}
                <td className="cell-actions">
                  <span className="row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onEdit(trade)
                      }}
                      aria-label={`Edit ${trade.symbol} trade`}
                    >
                      <Pencil />
                    </button>
                    {onDelete ? (
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDelete(trade)
                        }}
                        aria-label={`Delete ${trade.symbol} trade`}
                      >
                        <Trash2 />
                      </button>
                    ) : null}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
