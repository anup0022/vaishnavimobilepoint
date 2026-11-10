import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Phone } from 'lucide-react'
import { WhatsApp } from './BrandIcons'
import { useSettings, whatsappLink } from '@/lib/useSettings'

/** WhatsApp / call shortcuts plus a back-to-top button. */
export default function FloatingActions() {
  const settings = useSettings()
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    // Desktop only: on phones the header's bottom action bar has WhatsApp and
    // Call, and these would sit on top of it.
    <div className="fixed bottom-6 right-4 z-[120] hidden flex-col items-end gap-3 sm:right-6 lg:flex">
      <a
        href={whatsappLink(settings)}
        target="_blank"
        rel="noreferrer noopener"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 transition-transform hover:scale-110"
        aria-label="Chat with us on WhatsApp"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366]/50 animate-pulse-ring" aria-hidden="true" />
        <WhatsApp size={26} className="relative" />
      </a>

      <a
        href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-700 bg-ink-800 text-mist-50 shadow-xl transition-transform hover:scale-110 sm:hidden"
        aria-label="Call the shop"
      >
        <Phone size={22} />
      </a>

      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-700 bg-ink-800 text-mist-200 backdrop-blur transition hover:border-brand-600/50 hover:text-brand-700"
            aria-label="Back to top"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
