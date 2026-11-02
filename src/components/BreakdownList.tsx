import type { Breakdown } from '../lib/analytics'
import { formatMoney } from '../lib/format'

interface BreakdownListProps {
  items: Breakdown[]
  currency: string
  limit?: number
  emptyText?: string
  showWinRate?: boolean
}

export function BreakdownList({
  items,
  currency,
  limit = 6,
  emptyText = 'Nothing to break down yet.',
  showWinRate = true,
}: BreakdownListProps) {
  const shown = items.slice(0, limit)
  const maxAbs = Math.max(1, ...shown.map((item) => Math.abs(item.net)))

  if (items.length === 0) {
    return <div className="chart-empty">{emptyText}</div>
  }

  return (
    <div className="breakdown">
      {shown.map((item) => (
        <div className="breakdown-row" key={item.key}>
          <div className="breakdown-top">
            <span className="breakdown-label">{item.label}</span>
            <span className={`breakdown-net tabular ${item.net > 0 ? 'win' : item.net < 0 ? 'loss' : 'flat'}`}>
              {formatMoney(item.net, currency, { signed: true })}
            </span>
          </div>
          <div className="breakdown-track">
            <span
              className={`breakdown-fill ${item.net < 0 ? 'neg' : ''}`}
              style={{ width: `${Math.max(2, (Math.abs(item.net) / maxAbs) * 100)}%` }}
            />
          </div>
          <div className="breakdown-meta">
            <span>
              {item.count} {item.count === 1 ? 'trade' : 'trades'}
            </span>
            {showWinRate ? <span>{item.winRate.toFixed(0)}% win</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
