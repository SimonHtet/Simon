// Tiny global toast bus — call toast() from anywhere, <Toaster /> renders them.
export type ToastItem = { id: number; message: string; type: 'success' | 'error' }

type Listener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
let listeners: Listener[] = []
let nextId = 1

function emit() {
  for (const l of listeners) l([...toasts])
}

export function toast(message: string, type: 'success' | 'error' = 'success') {
  const id = nextId++
  toasts = [...toasts, { id, message, type }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 3500)
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
