import { Check, TriangleAlert } from 'lucide-react'

export interface ToastMessage {
  id: number
  message: string
  tone: 'success' | 'error'
}

export function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          {toast.tone === 'error' ? <TriangleAlert /> : <Check />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
