import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, Trash2, X } from 'lucide-react'
import type { Market, Side, TradeStatus } from '../../shared/constants'
import { STRATEGY_SUGGESTIONS } from '../../shared/constants'
import type { Trade } from '../../shared/types'
import type { TradeDraft } from '../lib/api'
import { tradeResult } from '../lib/analytics'
import { todayISO } from '../lib/dates'
import { formatMoney, formatPct } from '../lib/format'

interface TradeDrawerProps {
  trade: Trade | null
  currency: string
  onClose: () => void
  onSave: (draft: TradeDraft, id?: string) => Promise<void>
  onDelete: (trade: Trade) => void
}

interface FormState {
  symbol: string
  market: Market
  side: Side
  status: TradeStatus
  entryPrice: string
  exitPrice: string
  quantity: string
  fees: string
  entryDate: string
  exitDate: string
  strategy: string
  notes: string
}

type Errors = Partial<Record<keyof FormState, string>>

const SYMBOL_HINTS: Record<Market, string[]> = {
  crypto: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
  stocks: ['NVDA', 'AAPL', 'TSLA'],
  forex: ['EUR/USD', 'GBP/USD', 'XAU/USD'],
}

function initialState(trade: Trade | null): FormState {
  const today = todayISO()
  if (!trade) {
    return {
      symbol: '',
      market: 'crypto',
      side: 'long',
      status: 'closed',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      fees: '0',
      entryDate: today,
      exitDate: today,
      strategy: '',
      notes: '',
    }
  }
  return {
    symbol: trade.symbol,
    market: trade.market,
    side: trade.side,
    status: trade.status,
    entryPrice: String(trade.entryPrice),
    exitPrice: trade.exitPrice === null ? '' : String(trade.exitPrice),
    quantity: String(trade.quantity),
    fees: String(trade.fees),
    entryDate: trade.entryDate,
    exitDate: trade.exitDate ?? today,
    strategy: trade.strategy,
    notes: trade.notes,
  }
}

export function TradeDrawer({ trade, currency, onClose, onSave, onDelete }: TradeDrawerProps) {
  const [form, setForm] = useState<FormState>(() => initialState(trade))
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setFormError('')
  }

  function changeEntryDate(value: string) {
    setForm((current) => ({
      ...current,
      entryDate: value,
      exitDate:
        current.status === 'closed' && current.exitDate && current.exitDate < value
          ? value
          : current.exitDate,
    }))
    setErrors((current) => ({ ...current, entryDate: undefined, exitDate: undefined }))
  }

  function changeStatus(value: TradeStatus) {
    setForm((current) => ({
      ...current,
      status: value,
      exitDate: value === 'closed' && !current.exitDate ? todayISO() : current.exitDate,
    }))
    setErrors((current) => ({ ...current, status: undefined, exitDate: undefined }))
  }

  function validate(): Errors {
    const next: Errors = {}
    if (!form.symbol.trim()) next.symbol = 'Add a symbol.'
    else if (!/^[A-Za-z0-9][A-Za-z0-9/._:-]*$/.test(form.symbol.trim())) {
      next.symbol = 'Use letters, numbers and / . : - only.'
    }
    const entry = Number(form.entryPrice)
    if (!form.entryPrice.trim()) next.entryPrice = 'Add an entry price.'
    else if (!Number.isFinite(entry) || entry <= 0) next.entryPrice = 'Entry price must be above 0.'

    const quantity = Number(form.quantity)
    if (!form.quantity.trim()) next.quantity = 'Add a quantity.'
    else if (!Number.isFinite(quantity) || quantity <= 0) next.quantity = 'Quantity must be above 0.'

    const fees = Number(form.fees || '0')
    if (!Number.isFinite(fees) || fees < 0) next.fees = 'Fees cannot be negative.'

    if (!form.entryDate) next.entryDate = 'Pick an entry date.'
    else if (form.entryDate > todayISO()) next.entryDate = 'Entry date cannot be in the future.'

    if (form.status === 'closed') {
      const exit = Number(form.exitPrice)
      if (!form.exitPrice.trim()) next.exitPrice = 'Add an exit price to close the trade.'
      else if (!Number.isFinite(exit) || exit <= 0) next.exitPrice = 'Exit price must be above 0.'
      if (!form.exitDate) next.exitDate = 'Pick an exit date.'
      else if (form.exitDate > todayISO()) next.exitDate = 'Exit date cannot be in the future.'
      else if (form.entryDate && form.exitDate < form.entryDate) {
        next.exitDate = 'Exit date must be on or after the entry date.'
      }
    } else if (form.exitPrice.trim()) {
      const mark = Number(form.exitPrice)
      if (!Number.isFinite(mark) || mark <= 0) next.exitPrice = 'Mark price must be above 0.'
    }

    if (form.strategy.length > 40) next.strategy = 'Keep the strategy under 40 characters.'
    if (form.notes.length > 1000) next.notes = 'Notes must be 1,000 characters or fewer.'
    return next
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const draft: TradeDraft = {
      symbol: form.symbol.trim().toUpperCase(),
      market: form.market,
      side: form.side,
      status: form.status,
      entryPrice: Number(form.entryPrice),
      exitPrice: form.exitPrice.trim() ? Number(form.exitPrice) : null,
      quantity: Number(form.quantity),
      fees: Number(form.fees || 0),
      entryDate: form.entryDate,
      exitDate: form.status === 'closed' ? form.exitDate : null,
      strategy: form.strategy.trim(),
      notes: form.notes.trim(),
    }

    setBusy(true)
    setFormError('')
    try {
      await onSave(draft, trade?.id)
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save the trade.')
      setBusy(false)
    }
  }

  const preview = useMemo(() => {
    const entry = Number(form.entryPrice)
    const quantity = Number(form.quantity)
    const fees = Number(form.fees || '0')
    if (!Number.isFinite(entry) || !Number.isFinite(quantity) || entry <= 0 || quantity <= 0) {
      return null
    }
    const exit = form.exitPrice.trim() ? Number(form.exitPrice) : null
    const previewTrade: Trade = {
      id: 'preview',
      symbol: form.symbol || '—',
      market: form.market,
      side: form.side,
      status: form.status,
      entryPrice: entry,
      exitPrice: exit !== null && Number.isFinite(exit) && exit > 0 ? exit : null,
      quantity,
      fees: Number.isFinite(fees) ? fees : 0,
      entryDate: form.entryDate,
      exitDate: form.status === 'closed' ? form.exitDate : null,
      strategy: form.strategy,
      notes: form.notes,
      createdAt: '',
      updatedAt: '',
    }
    return { trade: previewTrade, result: tradeResult(previewTrade) }
  }, [form])

  const net = preview?.result.net ?? null
  const pct = preview?.result.pct ?? null
  const previewTone = net === null ? 'flat' : net > 0 ? 'win' : net < 0 ? 'loss' : 'flat'

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="trade-drawer-title">
        <form className="drawer-form" onSubmit={(event) => void submit(event)}>
          <header className="drawer-head">
            <div>
              <h2 className="drawer-title" id="trade-drawer-title">
                {trade ? 'Edit trade' : 'Log a trade'}
              </h2>
              <p className="drawer-sub">
                {trade
                  ? 'Update the numbers and your dashboard follows instantly.'
                  : 'Closed or open — every number stays in your journal.'}
              </p>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
              <X />
            </button>
          </header>

          <div className="drawer-body">
            <div className="form-section">
              <div className="form-section-title">Instrument</div>
              <div className="form-grid form-grid-2">
                <label className="field">
                  <span className="field-label">Symbol</span>
                  <input
                    className="input"
                    value={form.symbol}
                    onChange={(event) => update('symbol', event.target.value.toUpperCase())}
                    placeholder="BTC/USDT"
                    maxLength={20}
                    autoFocus
                    aria-invalid={Boolean(errors.symbol)}
                  />
                  {errors.symbol ? <span className="field-error">{errors.symbol}</span> : null}
                </label>
                <label className="field">
                  <span className="field-label">Market</span>
                  <select
                    className="select"
                    value={form.market}
                    onChange={(event) => update('market', event.target.value as Market)}
                  >
                    <option value="crypto">Crypto</option>
                    <option value="stocks">Stocks</option>
                    <option value="forex">Forex</option>
                  </select>
                </label>
              </div>
              <div className="symbol-hints">
                {SYMBOL_HINTS[form.market].map((symbol) => (
                  <button
                    type="button"
                    key={symbol}
                    className="chip-btn"
                    onClick={() => update('symbol', symbol)}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Position</div>
              <div className="form-grid form-grid-2">
                <div className="field">
                  <span className="field-label">Direction</span>
                  <div className="segmented segmented-wide">
                    <button
                      type="button"
                      className={form.side === 'long' ? 'active' : ''}
                      onClick={() => update('side', 'long')}
                    >
                      Long
                    </button>
                    <button
                      type="button"
                      className={form.side === 'short' ? 'active' : ''}
                      onClick={() => update('side', 'short')}
                    >
                      Short
                    </button>
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">Status</span>
                  <div className="segmented segmented-wide">
                    <button
                      type="button"
                      className={form.status === 'closed' ? 'active' : ''}
                      onClick={() => changeStatus('closed')}
                    >
                      Closed
                    </button>
                    <button
                      type="button"
                      className={form.status === 'open' ? 'active' : ''}
                      onClick={() => changeStatus('open')}
                    >
                      Open
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-grid form-grid-2" style={{ marginTop: 12 }}>
                <label className="field">
                  <span className="field-label">Entry price</span>
                  <input
                    className="input tabular"
                    inputMode="decimal"
                    value={form.entryPrice}
                    onChange={(event) => update('entryPrice', event.target.value)}
                    placeholder="0.00"
                    aria-invalid={Boolean(errors.entryPrice)}
                  />
                  {errors.entryPrice ? <span className="field-error">{errors.entryPrice}</span> : null}
                </label>
                <label className="field">
                  <span className="field-label">Quantity / size</span>
                  <input
                    className="input tabular"
                    inputMode="decimal"
                    value={form.quantity}
                    onChange={(event) => update('quantity', event.target.value)}
                    placeholder="0.00"
                    aria-invalid={Boolean(errors.quantity)}
                  />
                  {errors.quantity ? <span className="field-error">{errors.quantity}</span> : null}
                </label>
              </div>

              <div className="form-grid form-grid-2" style={{ marginTop: 12 }}>
                <label className="field">
                  <span className="field-label">Entry date</span>
                  <input
                    className="input"
                    type="date"
                    value={form.entryDate}
                    max={todayISO()}
                    onChange={(event) => changeEntryDate(event.target.value)}
                    aria-invalid={Boolean(errors.entryDate)}
                  />
                  {errors.entryDate ? <span className="field-error">{errors.entryDate}</span> : null}
                </label>
                <label className="field">
                  <span className="field-label">
                    Fees
                    <span className="field-hint">Total, both sides</span>
                  </span>
                  <input
                    className="input tabular"
                    inputMode="decimal"
                    value={form.fees}
                    onChange={(event) => update('fees', event.target.value)}
                    placeholder="0.00"
                    aria-invalid={Boolean(errors.fees)}
                  />
                  {errors.fees ? <span className="field-error">{errors.fees}</span> : null}
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">
                {form.status === 'closed' ? 'Exit' : 'Mark to market'}
              </div>
              <div className="form-grid form-grid-2">
                <label className="field">
                  <span className="field-label">
                    {form.status === 'closed' ? 'Exit price' : 'Mark price'}
                    {form.status === 'open' ? <span className="field-hint">Optional</span> : null}
                  </span>
                  <input
                    className="input tabular"
                    inputMode="decimal"
                    value={form.exitPrice}
                    onChange={(event) => update('exitPrice', event.target.value)}
                    placeholder="0.00"
                    aria-invalid={Boolean(errors.exitPrice)}
                  />
                  {errors.exitPrice ? <span className="field-error">{errors.exitPrice}</span> : null}
                </label>
                {form.status === 'closed' ? (
                  <label className="field">
                    <span className="field-label">Exit date</span>
                    <input
                      className="input"
                      type="date"
                      value={form.exitDate}
                      min={form.entryDate}
                      max={todayISO()}
                      onChange={(event) => update('exitDate', event.target.value)}
                      aria-invalid={Boolean(errors.exitDate)}
                    />
                    {errors.exitDate ? <span className="field-error">{errors.exitDate}</span> : null}
                  </label>
                ) : (
                  <div className="field">
                    <span className="field-label">Live P&amp;L</span>
                    <div className="mark-note">Add a mark price to track unrealized P&amp;L.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Context</div>
              <label className="field">
                <span className="field-label">
                  Strategy <span className="field-hint">Optional</span>
                </span>
                <input
                  className="input"
                  value={form.strategy}
                  onChange={(event) => update('strategy', event.target.value)}
                  placeholder="Breakout, swing, scalp…"
                  maxLength={40}
                  list="strategy-options"
                />
                <datalist id="strategy-options">
                  {STRATEGY_SUGGESTIONS.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
                {errors.strategy ? <span className="field-error">{errors.strategy}</span> : null}
              </label>
              <div className="symbol-hints">
                {STRATEGY_SUGGESTIONS.slice(0, 5).map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    className="chip-btn"
                    onClick={() => update('strategy', suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                <span className="field-label">
                  Notes <span className="field-hint">What did you see?</span>
                </span>
                <textarea
                  className="textarea"
                  value={form.notes}
                  onChange={(event) => update('notes', event.target.value)}
                  placeholder="Setup, execution, what you'd do differently…"
                  maxLength={1000}
                  rows={3}
                />
                {errors.notes ? <span className="field-error">{errors.notes}</span> : null}
              </label>
            </div>

            <div className="preview">
              <div className="preview-row">
                <span className="preview-label">
                  {form.status === 'open' ? 'Unrealized P&L' : 'Net P&L'}
                </span>
                <span className={`preview-value ${previewTone}`}>
                  {net === null ? '—' : formatMoney(net, currency, { signed: true })}
                </span>
              </div>
              <div className="preview-meta">
                <span>
                  Return <b className={previewTone}>{pct === null ? '—' : formatPct(pct)}</b>
                </span>
                <span>
                  Notional{' '}
                  <b>{preview ? formatMoney(preview.result.notional, currency, { compact: true }) : '—'}</b>
                </span>
                <span>
                  Fees <b>{formatMoney(Number(form.fees || 0), currency)}</b>
                </span>
              </div>
            </div>

            {formError ? <div className="form-error drawer-error">{formError}</div> : null}
          </div>

          <footer className="drawer-foot">
            {trade ? (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(trade)} disabled={busy}>
                <Trash2 />
                Delete
              </button>
            ) : null}
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              <ArrowLeft />
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner" /> : null}
              {trade ? 'Save changes' : 'Log trade'}
            </button>
          </footer>
        </form>
      </aside>
    </>
  )
}
