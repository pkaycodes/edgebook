import { useId, useMemo, useState, type PointerEvent } from 'react'
import type { DayPoint } from '../lib/analytics'
import { formatDate, formatShortDate } from '../lib/dates'
import { formatMoney } from '../lib/format'
import { useElementSize } from '../hooks/useElementSize'

interface EquityChartProps {
  points: DayPoint[]
  currency: string
}

const HEIGHT = 268
const PAD = { top: 16, right: 16, bottom: 28, left: 54 }

function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min]
  const step = (max - min) / (count - 1)
  return Array.from({ length: count }, (_, index) => min + step * index)
}

export function EquityChart({ points, currency }: EquityChartProps) {
  const [ref, width] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = useId().replace(/:/g, '')

  const geometry = useMemo(() => {
    if (width <= 0 || points.length < 2) return null
    const innerW = Math.max(10, width - PAD.left - PAD.right)
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const values = points.map((point) => point.value)
    let min = Math.min(0, ...values)
    let max = Math.max(0, ...values)
    if (min === max) {
      min -= 1
      max += 1
    }
    const pad = (max - min) * 0.08
    min -= pad
    max += pad
    const span = max - min || 1

    const x = (index: number) =>
      PAD.left + (index / Math.max(1, points.length - 1)) * innerW
    const y = (value: number) => PAD.top + innerH - ((value - min) / span) * innerH

    const line = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(2)} ${y(point.value).toFixed(2)}`)
      .join(' ')

    const area = `${line} L${x(points.length - 1).toFixed(2)} ${y(0).toFixed(2)} L${x(0).toFixed(2)} ${y(0).toFixed(2)} Z`
    const last = points[points.length - 1]
    const ticks = niceTicks(min, max, 5)
    const labelIndices = [0, Math.round((points.length - 1) / 3), Math.round(((points.length - 1) * 2) / 3), points.length - 1]

    return {
      innerW,
      innerH,
      x,
      y,
      line,
      area,
      ticks,
      last,
      labelIndices: [...new Set(labelIndices)],
    }
  }, [points, width])

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    if (!geometry) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - bounds.left
    const ratio = (px - PAD.left) / geometry.innerW
    const index = Math.round(ratio * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, index)))
  }

  const hoverPoint = hover !== null ? points[hover] : null
  const hoverX = geometry && hover !== null ? geometry.x(hover) : 0
  const hoverY = geometry && hoverPoint ? geometry.y(hoverPoint.value) : 0

  return (
    <div className="equity-chart" ref={ref}>
      {geometry === null ? (
        <div className="chart-empty">Not enough closed trades in this period yet.</div>
      ) : (
        <>
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label="Cumulative net profit and loss"
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={`equity-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c9f75a" stopOpacity="0.24" />
                <stop offset="70%" stopColor="#c9f75a" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#c9f75a" stopOpacity="0" />
              </linearGradient>
            </defs>

            {geometry.ticks.map((tick) => {
              const y = geometry.y(tick)
              const isZero = Math.abs(tick) < 0.0001
              return (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y}
                    y2={y}
                    stroke={isZero ? '#2a343e' : '#1a222a'}
                    strokeWidth="1"
                    strokeDasharray={isZero ? undefined : '3 5'}
                  />
                  <text
                    x={PAD.left - 9}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="9.5"
                    fill="#66726a"
                    fontFamily="var(--font-sans)"
                  >
                    {formatMoney(tick, currency, { compact: true })}
                  </text>
                </g>
              )
            })}

            <path d={geometry.area} fill={`url(#equity-${gradientId})`} />
            <path
              d={geometry.line}
              fill="none"
              stroke="#c9f75a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <line
              x1={geometry.x(points.length - 1)}
              x2={geometry.x(points.length - 1)}
              y1={geometry.y(geometry.last.value)}
              y2={HEIGHT - PAD.bottom}
              stroke="rgba(201,247,90,0.18)"
              strokeDasharray="2 4"
            />
            <circle
              cx={geometry.x(points.length - 1)}
              cy={geometry.y(geometry.last.value)}
              r="3.2"
              fill="#c9f75a"
              stroke="#0f1318"
              strokeWidth="2"
            />

            {hover !== null && hoverPoint ? (
              <g>
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={PAD.top}
                  y2={HEIGHT - PAD.bottom}
                  stroke="#3a4650"
                  strokeDasharray="3 4"
                />
                <circle cx={hoverX} cy={hoverY} r="4" fill="#c9f75a" stroke="#0f1318" strokeWidth="2" />
              </g>
            ) : null}

            {geometry.labelIndices.map((index) => (
              <text
                key={index}
                x={geometry.x(index)}
                y={HEIGHT - 8}
                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                fontSize="9.5"
                fill="#66726a"
                fontFamily="var(--font-sans)"
              >
                {formatShortDate(points[index].date)}
              </text>
            ))}
          </svg>

          {hoverPoint ? (
            <div
              className="chart-tooltip"
              style={{
                left: Math.max(72, Math.min(width - 72, hoverX)),
                top: hoverY,
              }}
            >
              <strong>{formatMoney(hoverPoint.value, currency, { signed: true })}</strong>
              {formatDate(hoverPoint.date, { year: false })}
              {hoverPoint.trades > 0 ? (
                <>
                  {' · '}
                  <span className={hoverPoint.delta >= 0 ? 'win' : 'loss'}>
                    {formatMoney(hoverPoint.delta, currency, { signed: true })}
                  </span>{' '}
                  that day
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
