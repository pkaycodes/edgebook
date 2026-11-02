import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Sparkline } from './Sparkline'

interface StatCardProps {
  label: string
  value: string
  sub: ReactNode
  icon: LucideIcon
  tone?: 'win' | 'loss' | 'neutral'
  spark?: number[]
  meter?: number
  hint?: string
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'neutral', spark, meter, hint }: StatCardProps) {
  return (
    <div className={`card stat ${tone !== 'neutral' ? `stat-${tone}` : ''}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">
          <Icon />
        </span>
      </div>
      <div className={`stat-value display tabular ${tone === 'win' ? 'win' : tone === 'loss' ? 'loss' : ''}`}>
        {value}
      </div>
      <div className="stat-sub">{sub}</div>
      {typeof meter === 'number' ? (
        <div className="stat-meter">
          <span style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </div>
      ) : null}
      {spark && spark.length > 1 ? (
        <div className="stat-spark">
          <Sparkline values={spark} width={104} height={38} tone={tone === 'loss' ? 'loss' : 'auto'} />
        </div>
      ) : null}
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </div>
  )
}
