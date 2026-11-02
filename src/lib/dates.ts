export type Period = '7d' | '30d' | '90d' | 'ytd' | 'all'

export const PERIODS: Array<{ id: Period; label: string }> = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: 'all', label: 'All' },
]

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function parseISO(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00`)
}

export function addDays(iso: string, days: number): string {
  const date = parseISO(iso)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

export function daysBetween(from: string, to: string): number {
  const ms = parseISO(to).getTime() - parseISO(from).getTime()
  return Math.round(ms / 86_400_000)
}

export function startOfPeriod(period: Period): string | null {
  if (period === 'all') return null
  const today = new Date()
  if (period === 'ytd') {
    return `${today.getFullYear()}-01-01`
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))
  return toISO(start)
}

export function formatDate(iso: string, options: { year?: boolean; weekday?: boolean } = {}): string {
  const date = parseISO(iso)
  const { year = true, weekday = false } = options
  const parts: string[] = []
  if (weekday) parts.push(WEEKDAYS[weekdayIndex(iso)])
  parts.push(`${date.getDate()} ${MONTHS[date.getMonth()]}`)
  if (year) parts.push(String(date.getFullYear()))
  return parts.join(' ')
}

export function formatShortDate(iso: string): string {
  const date = parseISO(iso)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export function formatMonth(iso: string): string {
  const date = parseISO(iso)
  return `${MONTHS[date.getMonth()]} ’${String(date.getFullYear()).slice(2)}`
}

export function weekdayIndex(iso: string): number {
  // Monday = 0 … Sunday = 6
  return (parseISO(iso).getDay() + 6) % 7
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[weekdayIndex(iso)]
}

export function listDays(start: string, end: string): string[] {
  const days: string[] = []
  let cursor = start
  for (let guard = 0; guard < 10_000; guard += 1) {
    days.push(cursor)
    if (cursor >= end) break
    cursor = addDays(cursor, 1)
  }
  return days
}

export function formatRange(start: string, end: string): string {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  const sameYear = startDate.getFullYear() === endDate.getFullYear()
  const startLabel = `${startDate.getDate()} ${MONTHS[startDate.getMonth()]}`
  const endLabel = `${endDate.getDate()} ${MONTHS[endDate.getMonth()]}${sameYear ? '' : ` ${endDate.getFullYear()}`}`
  return `${startLabel} – ${endLabel}`
}
