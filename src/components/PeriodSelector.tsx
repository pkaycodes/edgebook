import { PERIODS, type Period } from '../lib/dates'

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
  label?: string
}

export function PeriodSelector({ value, onChange, label = 'Period' }: PeriodSelectorProps) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {PERIODS.map((period) => (
        <button
          key={period.id}
          type="button"
          className={value === period.id ? 'active' : undefined}
          onClick={() => onChange(period.id)}
          aria-pressed={value === period.id}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}
