import { useEffect } from 'react'

export interface ConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  action: () => Promise<void> | void
}

interface ConfirmDialogProps {
  request: ConfirmRequest
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ request, busy, onClose, onConfirm }: ConfirmDialogProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  return (
    <>
      <div className="overlay" onClick={() => !busy && onClose()} />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 className="modal-title" id="confirm-title">
          {request.title}
        </h2>
        <p className="modal-text">{request.body}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${request.tone === 'primary' ? 'btn-primary' : 'btn-danger'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="spinner" /> : null}
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}
