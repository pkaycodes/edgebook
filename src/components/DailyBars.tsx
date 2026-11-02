import { useMemo, useState, type PointerEvent } from 'react'
import type { EquityPoint } from '../lib/analytics'
import { formatMoney } from '../lib/format'
import { useElementSize } from '../hooks/useElementSize'

interface DailyBarsProps {
  bars: EquityPoint[]
  currency: string
}

const HEIGHT = 236
const PAD = { top: 14, right: 8, bottom: 26, left: 48 }

export function DailyBars({ bars, currency }: DailyBarsProps) {
  const [ref, width] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const geometry = useMemo(() => {
    if (width <= 0 || bars.length === 0) return null
    const innerW = Math.max(10, width - PAD.left - PAD.right)
    const innerH = HEIGHT - PAD.top - PAD.bottom
    let min = Math.min(0, ...bars.map((bar) => bar.delta))
    let max = Math.max(0, ...bars.map((bar) => bar.delta))
    if (min === max) {
      min -= 1
      max += 1
    }
    const pad = (max - min) * 0.12
    min -= pad
    max += pad
    const span = max - min || 1
    const zeroY = PAD.top + innerH - ((0 - min) / span) * innerH
    const slot = innerW / bars.length
    const barWidth = Math.max(3, Math.min(28, slot * 0.58))
    const y = (value: number) => PAD.top + innerH - ((value - min) / span) * innerH
    const x = (index: number) => PAD.left + slot * index + slot / 2
    const ticks = [max, 0, min].filter((value, index, list) => list.indexOf(value) === index)
    const labelEvery = Math.max(1, Math.ceil(bars.length / 7))
    return { innerW, innerH, zeroY, slot, barWidth, y, x, ticks, labelEvery }
  }, [bars, width])

  function handleMove(event: PointerEvent<SVGSVGElement>) {
    if (!geometry) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - bounds.left - PAD.left
    const index = Math.floor(px / geometry.slot)
    setHover(Math.max(0, Math.min(bars.length - 1, index)))
  }

  const active = hover !== null ? bars[hover] : null

  return (
    <div className="daily-bars" ref={ref}>
      {geometry === null ? (
        <div className="chart-empty">No daily results to show yet.</div>
      ) : (
        <>
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label="Daily net profit and loss"
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
          >
            {geometry.ticks.map((tick) => {
              const y = geometry.y(tick)
              return (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y}
                    y2={y}
                    stroke={tick === 0 ? '#2a343e' : '#1a222a'}
                    strokeDasharray={tick === 0 ? undefined : '3 5'}
                  />
                  <text
                    x={PAD.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="9.5"
                    fill="#66726a"
                  >
                    {formatMoney(tick, currency, { compact: true })}
                  </text>
                </g>
              )
            })}

            {bars.map((bar, index) => {
              const x = geometry.x(index) - geometry.barWidth / 2
              const y = geometry.y(bar.delta)
              const top = Math.min(y, geometry.zeroY)
              const height = Math.max(1.5, Math.abs(geometry.zeroY - y))
              const isPositive = bar.delta >= 0
              return (
                <rect
                  key={`${bar.date}-${index}`}
                  x={x}
                  y={top}
                  width={geometry.barWidth}
                  height={height}
                  rx={Math.min(3, geometry.barWidth / 3)}
                  fill={isPositive ? '#5be3a3' : '#ff7b7b'}
                  opacity={hover === null || hover === index ? (bar.delta === 0 ? 0.35 : 0.9) : 0.4}
                />
              )
            })}

            {bars.map((bar, index) =>
              index % geometry.labelEvery === 0 ? (
                <text
                  key={`label-${bar.date}-${index}`}
                  x={geometry.x(index)}
                  y={HEIGHT - 7}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#66726a"
                >
                  {bar.label.split(' – ')[0]}
                </text>
              ) : null,
            )}
          </svg>

          {active ? (
            <div
              className="chart-tooltip"
              style={{
                left: Math.max(64, Math.min(width - 64, geometry.x(hover ?? 0))),
                top: geometry.y(active.delta),
              }}
            >
              <strong className={active.delta >= 0 ? 'win' : 'loss'}>
                {formatMoney(active.delta, currency, { signed: true })}
              </strong>
              {active.label}
              {active.trades > 0 ? ` · ${active.trades} ${active.trades === 1 ? 'trade' : 'trades'}` : ''}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
