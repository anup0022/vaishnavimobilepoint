import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Menu, X, Phone, Wrench, Megaphone, MapPin, Clock4, MessageCircle, ArrowUpRight,
} from 'lucide-react'
import { useSettings, fullAddress, whatsappLink } from '@/lib/useSettings'

const LINKS = [
  { to: '/', label: 'Home', hint: 'Start here' },
  { to: '/products', label: 'Shop', hint: 'Phones, audio, accessories' },
  { to: '/services', label: 'Repairs', hint: 'Services and charges' },
  { to: '/book', label: 'Book a Repair', hint: 'Get a ticket number' },
  { to: '/track', label: 'Track Repair', hint: 'Check your repair status' },
  { to: '/feedback', label: 'Reviews', hint: 'What customers say' },
  { to: '/about', label: 'About', hint: 'Our story since 2005' },
  { to: '/contact', label: 'Contact', hint: 'Find us and get in touch' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const settings = useSettings()
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock the page behind the open menu, and let Escape close it.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const telHref = `tel:${(settings.phone_primary || '').replace(/\s/g, '')}`

  return (
    <>
      {settings.announcement && (
        <div className="relative z-[90] overflow-hidden bg-key py-2 text-center text-[13px] font-bold text-ink-950">
          <div className="flex items-center justify-center gap-2 px-4">
            <Megaphone size={14} className="shrink-0" />
            <span className="truncate">{settings.announcement}</span>
          </div>
        </div>
      )}

      {/* The dock. Kept in flow rather than floated free: it is the same
          element on all eleven routes, and taking it out of flow would slide
          every other page up underneath it. */}
      <header className="sticky top-0 z-[100] px-3 pt-3">
        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-3 py-2.5 transition-all duration-300 sm:px-4 ${
            scrolled ? 'glass-strong lift-lg' : 'border border-transparent'
          }`}
        >
          <Link to="/" className="group flex shrink-0 items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-key text-xl font-extrabold text-ink-950 shadow-lg shadow-key/25 transition-transform duration-300 group-hover:scale-105">
              V
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-base font-bold tracking-tight">{settings.shop_name}</span>
              <span className="readout block text-[10px] uppercase tracking-[0.12em] text-mist-500">
                {settings.city || 'Ranchi'} &middot; Since {settings.established || '2005'}
              </span>
            </span>
          </Link>

          {/* The link list lives in the menu panel at every width, so the bar
              itself stays down to a logo, one phone number and one CTA. */}
          <div className="flex items-center gap-2">
            <a
              href={telHref}
              className="readout hidden items-center gap-2 rounded-full border border-ink-600 bg-ink-900 px-4 py-2.5 text-sm font-semibold text-mist-200 transition hover:border-brand-600 hover:text-brand-700 md:flex"
            >
              <Phone size={15} />
              {settings.phone_primary}
            </a>

            <Link to="/book" className="btn-primary hidden px-5 py-2.5 text-sm sm:inline-flex">
              <Wrench size={16} />
              Book a Repair
            </Link>

            <button
              onClick={() => setOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-ink-600 bg-ink-900 px-3.5 text-sm font-semibold text-mist-200 transition hover:border-brand-600 hover:text-brand-700"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Menu size={20} />
              <span className="hidden lg:inline">Menu</span>
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[160] bg-ink-950/97 backdrop-blur-xl"
          >
            <div className="mx-auto flex h-full max-w-7xl flex-col px-5 pb-8 pt-5 sm:px-8">
              <div className="flex items-center justify-between">
                <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-key text-xl font-extrabold text-ink-950">
                    V
                  </span>
                  <span className="leading-tight">
                    <span className="block font-display text-base font-bold">{settings.shop_name}</span>
                    {settings.shop_name_local && (
                      <span className="block text-[11px] text-mist-500">{settings.shop_name_local}</span>
                    )}
                  </span>
                </Link>

                <button
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-600 bg-ink-900 text-mist-400 transition hover:border-brand-600/50 hover:text-brand-600"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-8 grid flex-1 content-start gap-10 overflow-y-auto lg:grid-cols-[1.35fr_1fr] lg:gap-16">
                {/* links */}
                <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                  {LINKS.map((link, i) => (
                    <motion.li
                      key={link.to}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 + i * 0.045, duration: 0.35 }}
                    >
                      <NavLink
                        to={link.to}
                        end={link.to === '/'}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `group flex items-center justify-between gap-4 rounded-2xl border border-transparent px-4 py-3.5 transition-colors ${
                            isActive ? 'border-ink-700 bg-ink-900 lift' : 'hover:border-ink-700 hover:bg-ink-900'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className="min-w-0">
                              <span
                                className={`block font-display text-2xl font-bold leading-tight sm:text-3xl ${
                                  isActive ? 'text-key' : 'text-mist-50'
                                }`}
                              >
                                {link.label}
                              </span>
                              <span className="block truncate text-xs text-mist-500">{link.hint}</span>
                            </span>
                            <ArrowUpRight
                              size={20}
                              className="shrink-0 text-mist-500 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-brand-700"
                            />
                          </>
                        )}
                      </NavLink>
                    </motion.li>
                  ))}
                </ul>

                {/* shop details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="rounded-3xl border border-ink-700 bg-ink-900 lift p-6 sm:p-7"
                >
                  <h2 className="mb-5 font-display text-lg font-bold">Visit the shop</h2>

                  <ul className="space-y-4 text-sm">
                    <li className="flex gap-3">
                      <MapPin size={17} className="mt-0.5 shrink-0 text-brand-700" />
                      <span className="leading-relaxed text-mist-400">{fullAddress(settings)}</span>
                    </li>
                    <li className="flex gap-3">
                      <Phone size={17} className="mt-0.5 shrink-0 text-brand-700" />
                      <span className="flex flex-col">
                        <a href={telHref} className="text-mist-300 hover:text-brand-700">
                          {settings.phone_primary}
                        </a>
                        {settings.phone_secondary && (
                          <a
                            href={`tel:${settings.phone_secondary.replace(/\s/g, '')}`}
                            className="text-mist-300 hover:text-brand-700"
                          >
                            {settings.phone_secondary}
                          </a>
                        )}
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <Clock4 size={17} className="mt-0.5 shrink-0 text-brand-700" />
                      <span className="leading-relaxed text-mist-400">
                        Mon&ndash;Sat {settings.hours_weekday}
                        <br />
                        Sunday {settings.hours_sunday}
                      </span>
                    </li>
                  </ul>

                  <div className="mt-7 flex flex-col gap-3">
                    <Link to="/book" onClick={() => setOpen(false)} className="btn-primary w-full">
                      <Wrench size={18} /> Book a Repair
                    </Link>
                    <a
                      href={whatsappLink(settings)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn-ghost w-full"
                    >
                      <MessageCircle size={18} /> WhatsApp us
                    </a>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
