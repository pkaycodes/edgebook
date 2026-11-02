import type { CurrencyCode } from '../../shared/constants'
import type { SessionPayload, Settings, Trade } from '../../shared/types'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string; code?: string } }
    | null
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      payload?.error?.code,
    )
  }
  return payload as T
}

export type TradeDraft = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>

export const api = {
  me: () => request<SessionPayload>('/auth/me'),
  login: (email: string, password: string) =>
    request<SessionPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<SessionPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  demo: () => request<SessionPayload>('/auth/demo', { method: 'POST' }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  updateProfile: (name: string) =>
    request<SessionPayload>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  updateSettings: (currency: CurrencyCode) =>
    request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ currency }),
    }),
  deleteAccount: () => request<{ ok: true }>('/account', { method: 'DELETE' }),

  trades: () => request<{ trades: Trade[] }>('/trades'),
  createTrade: (draft: TradeDraft) =>
    request<{ trade: Trade }>('/trades', {
      method: 'POST',
      body: JSON.stringify(draft),
    }),
  updateTrade: (id: string, draft: Partial<TradeDraft>) =>
    request<{ trade: Trade }>(`/trades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
    }),
  deleteTrade: (id: string) => request<{ ok: true }>(`/trades/${id}`, { method: 'DELETE' }),
  clearTrades: () => request<{ ok: true }>('/trades', { method: 'DELETE' }),
  loadSampleTrades: () =>
    request<{ inserted: number; trades: Trade[] }>('/trades/sample', { method: 'POST' }),
}
