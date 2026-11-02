import { useId } from 'react'

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  tone?: 'auto' | 'accent' | 'win' | 'loss'
}

export function Sparkline({ values, width = 96, height = 36, tone = 'auto' }: SparklineProps) {
  const id = useId().replace(/:/g, '')
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 3
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const step = innerW / (values.length - 1)

  const points = values.map((value, index) => ({
    x: pad + index * step,
    y: pad + innerH - ((value - min) / span) * innerH,
  }))

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')

  const final = values[values.length - 1]
  const first = values[0]
  const color =
    tone === 'accent'
      ? 'var(--accent)'
      : tone === 'win'
        ? 'var(--green)'
        : tone === 'loss'
          ? 'var(--red)'
          : final >= first
            ? 'var(--green)'
            : 'var(--red)'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="sparkline">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${line} L${points[points.length - 1].x} ${height} L${points[0].x} ${height} Z`}
        fill={`url(#spark-${id})`}
      />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
