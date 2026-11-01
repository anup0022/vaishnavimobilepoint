import { useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface Props {
  children: ReactNode
  onClose: () => void
  title: string
  wide?: boolean
}

/** Centred dialog used across the admin screens. Closes on Escape or backdrop click. */
export default function Modal({ children, onClose, title, wide }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-mist-50/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className={`my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-3xl border border-ink-700 bg-ink-900 p-7 shadow-2xl sm:p-8`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 text-mist-400 transition hover:text-mist-50"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
