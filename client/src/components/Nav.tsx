import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Menu, X, Phone, Search, PackageSearch, MessageCircle, LayoutGrid, MapPin, Clock4, Wrench,
} from 'lucide-react'
import { useSettings, fullAddress, whatsappLink } from '@/lib/useSettings'
import Wordmark from './store/Wordmark'
import './store/store.css'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Shop' },
  { to: '/services', label: 'Repairs' },
  { to: '/book', label: 'Book Repair' },
  { to: '/track', label: 'Track Repair' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

/** Only in the phone menu: the top bar has no room for them. */
const MORE_LINKS = [
  { to: '/feedback', label: 'Reviews' },
  { to: '/faq', label: 'FAQ' },
]

const iconButton =
  'flex h-11 w-11 items-center justify-center text-black transition-colors hover:text-[var(--st-accent-ink)]'

/**
 * Store header: a black announcement strip, then a white bar with the
 * wordmark, the page links and four actions — search the catalogue, track a
 * repair, WhatsApp and call. On phones the links move into a slide-in menu
 * and the actions into a bar fixed to the bottom of the screen.
 */
export default function Nav() {
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [term, setTerm] = useState('')
  const settings = useSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setOpen(false)
    setSearching(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock the page behind the open menu, and let Escape close menu or search.
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      setSearching(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (searching) searchInput.current?.focus()
  }, [searching])

  function submitSearch(e: FormEvent) {
    e.preventDefault()
    const q = term.trim()
    setSearching(false)
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
  }

  const telHref = `tel:${(settings.phone_primary || '').replace(/\s/g, '')}`
  const wa = whatsappLink(settings)

  // A fragment, not a wrapper: the header is sticky, and a sticky element
  // only sticks inside its parent — a wrapper ending below the header would
  // carry it off the screen.
  return (
    <>
      {settings.announcement && (
        <div className="st relative z-[90] bg-black px-4 py-2.5 text-center text-[12px] font-medium leading-snug tracking-[0.04em] text-white sm:text-[13px]">
          <p>{settings.announcement}</p>
        </div>
      )}

      <header
        className={`st sticky top-0 z-[100] bg-white transition-shadow duration-300 ${
          scrolled || searching ? 'shadow-[0_2px_18px_rgb(0_0_0/0.08)]' : ''
        }`}
      >
        <nav className="st-container grid h-[52px] grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[85px]">
          {/* phones: menu button left, logo centred */}
          <div className="flex items-center lg:hidden">
            <button onClick={() => setOpen(true)} className={`-ml-2.5 ${iconButton}`} aria-label="Open menu" aria-expanded={open}>
              <Menu size={24} strokeWidth={1.6} />
            </button>
          </div>

          <Link to="/" className="justify-self-center lg:justify-self-start">
            <Wordmark />
          </Link>

          <ul className="hidden items-center justify-center gap-6 lg:flex xl:gap-10 min-[1400px]:gap-[50px]">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `relative whitespace-nowrap py-2 text-[13px] font-medium uppercase transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-current after:transition-transform ${
                      isActive
                        ? 'text-[var(--st-accent-ink)] after:scale-x-100'
                        : 'text-black after:scale-x-0 hover:text-[var(--st-accent-ink)] hover:after:scale-x-100'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-end">
            <button
              onClick={() => setSearching((s) => !s)}
              className={iconButton}
              aria-label="Search products"
              aria-expanded={searching}
            >
              <Search size={22} strokeWidth={1.6} />
            </button>
            <Link to="/track" className={`hidden lg:flex ${iconButton}`} aria-label="Track your repair" title="Track your repair">
              <PackageSearch size={22} strokeWidth={1.6} />
            </Link>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer noopener"
              className={`hidden lg:flex ${iconButton}`}
              aria-label="Chat on WhatsApp"
              title="WhatsApp"
            >
              <MessageCircle size={22} strokeWidth={1.6} />
            </a>
            <a href={telHref} className={`relative ${iconButton}`} aria-label={`Call ${settings.phone_primary}`} title={settings.phone_primary}>
              <Phone size={21} strokeWidth={1.6} />
              <span className="absolute right-1.5 top-2 h-2 w-2 rounded-full bg-[var(--st-accent)] ring-2 ring-white" aria-hidden="true" />
            </a>
          </div>
        </nav>

        <AnimatePresence>
          {searching && (
            <motion.form
              onSubmit={submitSearch}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-[var(--st-line)] bg-white"
              role="search"
            >
              <div className="st-container flex items-center gap-3 py-4">
                <Search size={20} strokeWidth={1.6} className="shrink-0 text-black/50" />
                <label htmlFor="site-search" className="sr-only">Search phones and accessories</label>
                <input
                  id="site-search"
                  ref={searchInput}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search phones, earbuds, chargers…"
                  className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-black outline-none placeholder:text-black/40"
                  autoComplete="off"
                />
                <button type="submit" className="st-btn px-5 sm:px-9">Search</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </header>

      {/* phones: slide-in menu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[160] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              className="st fixed inset-y-0 left-0 z-[170] flex w-[86vw] max-w-[360px] flex-col overflow-y-auto bg-white"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <div className="flex items-center justify-between border-b border-[var(--st-line)] px-5 py-4">
                <Wordmark />
                <button onClick={() => setOpen(false)} className={iconButton} aria-label="Close menu">
                  <X size={22} strokeWidth={1.6} />
                </button>
              </div>

              <ul className="px-5 py-3">
                {[...LINKS, ...MORE_LINKS].map((link) => (
                  <li key={link.to} className="border-b border-[var(--st-line)]">
                    <NavLink
                      to={link.to}
                      end={link.to === '/'}
                      className={({ isActive }) =>
                        `block py-3.5 text-[14px] font-medium uppercase tracking-[0.08em] ${
                          isActive ? 'text-[var(--st-accent-ink)]' : 'text-black'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-4 bg-[var(--st-footer)] px-5 py-6 text-[14px]">
                <p className="flex gap-3">
                  <MapPin size={17} strokeWidth={1.6} className="mt-0.5 shrink-0 text-black" />
                  <span className="leading-relaxed">{fullAddress(settings)}</span>
                </p>
                <p className="flex gap-3">
                  <Clock4 size={17} strokeWidth={1.6} className="mt-0.5 shrink-0 text-black" />
                  <span className="leading-relaxed">
                    Mon&ndash;Sat {settings.hours_weekday}
                    <br />
                    Sunday {settings.hours_sunday}
                  </span>
                </p>
                <Link to="/book" className="st-btn w-full">
                  <Wrench size={15} /> Book a repair
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* phones: the actions, fixed to the bottom of the screen */}
      <nav
        className="st fixed inset-x-0 bottom-0 z-[110] grid grid-cols-5 divide-x divide-[var(--st-line)] border-t border-[var(--st-line)] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Quick actions"
      >
        <Link to="/products" className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium uppercase tracking-[0.06em] text-black">
          <LayoutGrid size={21} strokeWidth={1.6} /> Shop
        </Link>
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            setSearching(true)
          }}
          className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium uppercase tracking-[0.06em] text-black"
        >
          <Search size={21} strokeWidth={1.6} /> Search
        </button>
        <Link to="/track" className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium uppercase tracking-[0.06em] text-black">
          <PackageSearch size={21} strokeWidth={1.6} /> Track
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer noopener"
          className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium uppercase tracking-[0.06em] text-black"
        >
          <MessageCircle size={21} strokeWidth={1.6} /> WhatsApp
        </a>
        <a href={telHref} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium uppercase tracking-[0.06em] text-black">
          <Phone size={21} strokeWidth={1.6} /> Call
        </a>
      </nav>
    </>
  )
}
