
const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  GHS: 'GH₵',
  NGN: '₦',
  ZAR: 'R',
}

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? currency
}

export function formatMoney(
  value: number,
  currency: string,
  options: { signed?: boolean; compact?: boolean; decimals?: number } = {},
): string {
  const { signed = false, compact = false, decimals } = options
  const symbol = currencySymbol(currency)
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : ''

  if (compact) {
    const units: Array<[number, string]> = [
      [1_000_000_000, 'B'],
      [1_000_000, 'M'],
      [1_000, 'k'],
    ]
    for (const [size, suffix] of units) {
      if (abs >= size) {
        const digits = abs >= size * 100 ? 0 : 1
        return `${sign}${symbol}${(abs / size).toFixed(digits)}${suffix}`
      }
    }
    return `${sign}${symbol}${abs.toFixed(abs >= 100 ? 0 : 2)}`
  }

  const digits = decimals ?? 2
  return `${sign}${symbol}${abs.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function formatAxisMoney(value: number, currency: string): string {
  return formatMoney(value, currency, { compact: true, signed: false })
}

export function formatPct(value: number, options: { signed?: boolean; decimals?: number } = {}): string {
  const { signed = true, decimals = 1 } = options
  const abs = Math.abs(value).toFixed(decimals)
  if (value < 0) return `−${abs}%`
  return `${signed ? '+' : ''}${abs}%`
}

export function formatNumber(value: number, decimals = 2): string {
  const abs = Math.abs(value)
  const digits = abs >= 1000 ? 2 : abs >= 1 ? Math.min(4, decimals + 2) : 4
  return `${value < 0 ? '−' : ''}${abs.toLocaleString('en-US', {
    maximumFractionDigits: digits,
  })}`
}

export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString('en-US')
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

export function formatSign(value: number): string {
  return value < 0 ? '−' : value > 0 ? '+' : ''
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'E'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`)
}
