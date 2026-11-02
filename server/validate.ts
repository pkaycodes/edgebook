export class HttpError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Send a valid request body.')
  }
  return value as Record<string, unknown>
}

export function text(
  value: unknown,
  label: string,
  options: { min?: number; max?: number; optional?: boolean; fallback?: string } = {},
): string {
  const { min = 1, max = 240, optional = false, fallback = '' } = options
  if (value === undefined || value === null) {
    if (optional) return fallback
    throw new HttpError(400, `${label} is required.`)
  }
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be text.`)
  const trimmed = value.trim()
  if (trimmed.length < min) {
    if (optional) return fallback
    throw new HttpError(400, `${label} is required.`)
  }
  if (trimmed.length > max) {
    throw new HttpError(400, `${label} must be ${max} characters or fewer.`)
  }
  return trimmed
}

export function email(value: unknown): string {
  const result = text(value, 'Email address', { max: 254 }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new HttpError(400, 'Enter a valid email address.')
  }
  return result
}

export function password(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.')
  }
  if (value.length > 128) {
    throw new HttpError(400, 'Password must be 128 characters or fewer.')
  }
  return value
}

export function number(
  value: unknown,
  label: string,
  options: { min?: number; max?: number; optional?: boolean; fallback?: number } = {},
): number {
  const { min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = options
  if (value === undefined || value === null || value === '') {
    if (options.optional) return options.fallback ?? 0
    throw new HttpError(400, `${label} is required.`)
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) throw new HttpError(400, `${label} must be a number.`)
  if (parsed < min) throw new HttpError(400, `${label} must be at least ${min}.`)
  if (parsed > max) throw new HttpError(400, `${label} is too large.`)
  return parsed
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, `Choose a valid ${label.toLowerCase()}.`)
  }
  return value as T
}

export function isoDate(value: unknown, label = 'Date'): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `Choose a valid ${label.toLowerCase()}.`)
  }
  const parsed = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `Choose a valid ${label.toLowerCase()}.`)
  }
  const today = new Date()
  const limit = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  const limitISO = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(
    limit.getDate(),
  ).padStart(2, '0')}`
  if (value > limitISO) throw new HttpError(400, 'The date cannot be in the future.')
  if (value < '2000-01-01') throw new HttpError(400, 'That date is too far in the past.')
  return value
}

export function money(value: number): number {
  return Math.round(value * 100) / 100
}
