interface WinLossDonutProps {
  wins: number
  losses: number
  breakeven: number
  winRate: number
}

const SIZE = 168
const STROKE = 15
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function WinLossDonut({ wins, losses, breakeven, winRate }: WinLossDonutProps) {
  const total = wins + losses + breakeven
  const gap = total > 1 ? 2.6 : 0
  const segments = [
    { key: 'wins', count: wins, color: 'var(--green)' },
    { key: 'losses', count: losses, color: 'var(--red)' },
    { key: 'breakeven', count: breakeven, color: '#39454f' },
  ].filter((segment) => segment.count > 0)

  let offset = 0

  return (
    <div className="donut-block">
      <div className="donut-wrap" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Win and loss distribution">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#161d24"
            strokeWidth={STROKE}
          />
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {segments.map((segment) => {
              const length = Math.max(0, (segment.count / total) * CIRCUMFERENCE - gap)
              const dash = `${length} ${CIRCUMFERENCE - length}`
              const element = (
                <circle
                  key={segment.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              )
              offset += (segment.count / total) * CIRCUMFERENCE
              return element
            })}
          </g>
        </svg>
        <div className="donut-center">
          <strong>{total === 0 ? '—' : `${winRate.toFixed(0)}%`}</strong>
          <span>win rate</span>
        </div>
      </div>

      <div className="donut-legend">
        {[
          { label: 'Wins', count: wins, color: 'var(--green)' },
          { label: 'Losses', count: losses, color: 'var(--red)' },
          { label: 'Breakeven', count: breakeven, color: '#4a5763' },
        ].map((item) => (
          <div className="donut-legend-row" key={item.label}>
            <span className="donut-dot" style={{ background: item.color }} />
            <span className="donut-legend-label">{item.label}</span>
            <span className="donut-legend-count tabular">{item.count}</span>
            <span className="donut-legend-pct tabular">
              {total === 0 ? '0%' : `${Math.round((item.count / total) * 100)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
