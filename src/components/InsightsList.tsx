import {
  ArrowLeftRight,
  CalendarDays,
  Clock3,
  Crosshair,
  Flame,
  Gauge,
  PieChart,
  Receipt,
  TrendingDown,
  Trophy,
} from 'lucide-react'
import type { Insight, InsightIcon } from '../lib/analytics'

const ICONS: Record<InsightIcon, typeof Crosshair> = {
  strategy: Crosshair,
  fees: Receipt,
  calendar: CalendarDays,
  side: ArrowLeftRight,
  streak: Flame,
  hold: Clock3,
  trophy: Trophy,
  drawdown: TrendingDown,
  symbol: PieChart,
  expectancy: Gauge,
}

interface InsightsListProps {
  insights: Insight[]
  limit?: number
  layout?: 'list' | 'grid'
  emptyText?: string
}

export function InsightsList({
  insights,
  limit,
  layout = 'list',
  emptyText = 'Log a few more trades — patterns will start to surface.',
}: InsightsListProps) {
  const shown = limit ? insights.slice(0, limit) : insights
  if (shown.length === 0) {
    return <div className="chart-empty">{emptyText}</div>
  }
  return (
    <div className={`insight-list ${layout === 'grid' ? 'insight-grid' : ''}`}>
      {shown.map((insight) => {
        const Icon = ICONS[insight.icon]
        return (
          <div className={`insight-item tone-${insight.tone}`} key={insight.id}>
            <span className="insight-icon">
              <Icon />
            </span>
            <div className="insight-copy">
              <strong>{insight.title}</strong>
              <p>{insight.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
