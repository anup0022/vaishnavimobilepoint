import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  tone: Tone
  message: string
}

const ToastContext = createContext<{ push: (message: string, tone?: Tone) => void }>({ push: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const TONES: Record<Tone, { icon: typeof Info; ring: string; text: string }> = {
  success: { icon: CheckCircle2, ring: 'border-success/40 bg-success/10', text: 'text-success' },
  error: { icon: AlertTriangle, ring: 'border-danger/40 bg-danger/10', text: 'text-danger' },
  info: { icon: Info, ring: 'border-brand-500/40 bg-brand-500/10', text: 'text-brand-600' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, tone, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-20 right-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:top-24 sm:right-6"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const tone = TONES[toast.tone]
            const Icon = tone.icon
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 ${tone.ring}`}
              >
                <Icon size={20} className={`mt-0.5 shrink-0 ${tone.text}`} />
                <p className="flex-1 text-sm leading-relaxed text-mist-50">{toast.message}</p>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="shrink-0 text-mist-500 transition hover:text-mist-50"
                  aria-label="Dismiss notification"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
