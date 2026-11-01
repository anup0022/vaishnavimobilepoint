import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, X, Phone, MessageCircle, Wrench, Store, MapPin, Clock4, Check, ChevronRight,
  Smartphone, Headphones, Watch, Tablet, Cable, Ticket, ArrowRight,
} from 'lucide-react'
import {
  useShopData, galleryFor, money, openNow, stagger, EASE, CATEGORY_LABELS, AVAILABILITY_LABELS,
  type Product, type Settings,
} from '@/lib/data'
import SmartImg from '@/shell/SmartImg'

/* ------------------------------------------------------------------ *
 * DUKAAN
 *
 * Bright modular retail. Bento tiles, bilingual headings, an app-like
 * bottom tab bar on mobile. Motion is deliberately cheap and fast —
 * 150-200ms everywhere — because these customers are on budget Android
 * handsets and mobile data.
 *
 * The signature is live shop state: open/closed computed from the CMS
 * hours, the real festive announcement, and ticket lookup on the home
 * screen so a returning customer never has to navigate.
 * ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  smartphone: Smartphone,
  audio: Headphones,
  wearable: Watch,
  tablet: Tablet,
  accessory: Cable,
}

const TABS = [
  { key: 'shop', label: 'Shop', hi: 'दुकान', icon: Store },
  { key: 'repairs', label: 'Repairs', hi: 'मरम्मत', icon: Wrench },
  { key: 'track', label: 'Track', hi: 'ट्रैक', icon: Ticket },
  { key: 'call', label: 'Call', hi: 'कॉल', icon: Phone },
] as const

function whatsapp(s: Settings, msg: string) {
  return `https://wa.me/${s.whatsapp || ''}?text=${encodeURIComponent(msg)}`
}

export default function Dukaan() {
  const { products, facets, reviews, settings, stats, loading } = useShopData()
  const [open, setOpen] = useState<Product | null>(null)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<string>('shop')

  const status = useMemo(() => openNow(settings), [settings])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)),
    )
  }, [products, category, query])

  return (
    <div className="min-h-screen bg-d-canvas pb-24 font-dukaan text-d-ink md:pb-0">
      {/* ----------------------------- offer bar -------------------------- */}
      {settings.announcement && (
        <div className="bg-d-marigold px-4 py-2 text-center text-[12px] font-bold text-d-ink">
          {settings.announcement}
        </div>
      )}

      {/* ------------------------------- top bar -------------------------- */}
      <header className="sticky top-0 z-40 border-b border-d-line bg-d-tile/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-d-electric text-lg font-extrabold text-white">
            V
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-extrabold">{settings.shop_name}</span>
            <span className="block truncate font-deva text-[11px] text-d-mute">
              {settings.shop_name_local || 'रांची'}
            </span>
          </span>

          <div className="relative ml-auto hidden flex-1 max-w-sm md:block">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-d-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search phones, audio, chargers…"
              aria-label="Search the catalogue"
              className="w-full rounded-xl border border-d-line bg-d-canvas py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-d-electric focus:bg-white"
            />
          </div>

          <a
            href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`}
            className="ml-auto hidden shrink-0 items-center gap-2 rounded-xl bg-d-electric px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 active:scale-[0.97] md:ml-0 md:flex"
          >
            <Phone size={15} /> {settings.phone_primary}
          </a>

          <span
            className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold md:ml-0 ${
              status.open ? 'bg-d-jade/12 text-d-jade' : 'bg-d-mute/12 text-d-mute'
            }`}
          >
            {status.open ? 'Open' : 'Closed'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* ------------------------------ bento --------------------------- */}
        <div className="grid auto-rows-[112px] grid-cols-2 gap-3 md:grid-cols-4">
          {/* hero tile */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="col-span-2 row-span-2 flex flex-col justify-between overflow-hidden rounded-2xl bg-d-electric p-5 text-white"
          >
            <div>
              <h1 className="text-[clamp(1.5rem,4.2vw,2.3rem)] font-extrabold leading-[1.08] tracking-tight">
                Every phone you want.
                <br />
                Every repair you need.
              </h1>
              <p className="mt-2 font-deva text-[13px] text-white/75">हर फ़ोन, हर मरम्मत — एक ही दुकान पर।</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTab('repairs')}
                className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-d-electric transition active:scale-[0.97]"
              >
                Book a repair
              </button>
              <button
                onClick={() => document.getElementById('d-shop')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-xl border border-white/35 px-4 py-2.5 text-[13px] font-bold transition hover:bg-white/10 active:scale-[0.97]"
              >
                Browse stock
              </button>
            </div>
          </motion.section>

          {/* live status */}
          <Tile delay={0.04} className="col-span-2 row-span-1 md:col-span-1">
            <div className="flex h-full flex-col justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-d-mute">
                <Clock4 size={12} /> Today
              </span>
              <div>
                <div className={`text-xl font-extrabold ${status.open ? 'text-d-jade' : 'text-d-mute'}`}>
                  {status.open ? 'Open now' : 'Closed'}
                </div>
                <div className="text-[11px] text-d-mute">{status.label}</div>
              </div>
            </div>
          </Tile>

          {/* rating */}
          <Tile delay={0.08} className="col-span-2 row-span-1 md:col-span-1">
            <div className="flex h-full flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-d-mute">Rated</span>
              <div>
                <div className="text-xl font-extrabold text-d-ink">
                  {stats?.rating ?? 4.8}
                  <span className="text-d-marigold">★</span>
                </div>
                <div className="text-[11px] text-d-mute">{stats?.reviews ?? 0} reviews</div>
              </div>
            </div>
          </Tile>

          {/* categories */}
          {(facets.categories.length
            ? facets.categories
            : [{ category: 'smartphone', n: 0 }, { category: 'audio', n: 0 }, { category: 'wearable', n: 0 }, { category: 'accessory', n: 0 }]
          )
            .slice(0, 4)
            .map((c, i) => {
              const Icon = CATEGORY_ICONS[c.category] ?? Smartphone
              return (
                <Tile key={c.category} delay={0.12 + stagger(i, 0.03)} className="col-span-1 row-span-1">
                  <button
                    onClick={() => {
                      setCategory(c.category)
                      document.getElementById('d-shop')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="flex h-full w-full flex-col justify-between text-left"
                  >
                    <Icon size={18} className="text-d-electric" />
                    <span>
                      <span className="block text-[13px] font-bold leading-tight">
                        {CATEGORY_LABELS[c.category] || c.category}
                      </span>
                      <span className="block text-[11px] text-d-mute">{c.n} in stock</span>
                    </span>
                  </button>
                </Tile>
              )
            })}

          {/* inline ticket tracking */}
          <Tile delay={0.2} className="col-span-2 row-span-2">
            <div className="flex h-full flex-col justify-between">
              <div>
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-d-mute">
                  <Ticket size={12} /> Track a repair
                </span>
                <p className="mt-1.5 text-[12px] leading-relaxed text-d-mute">
                  Enter your ticket and the mobile number you booked with.
                </p>
              </div>
              <TrackTile />
            </div>
          </Tile>

          {/* visit */}
          <Tile delay={0.24} className="col-span-2 row-span-2 !p-0 overflow-hidden">
            <div className="relative h-full">
              <SmartImg src="/shop/shop-20.jpg" alt="The shop signboard" className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-d-ink/88 via-d-ink/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/70">
                  <MapPin size={12} /> Visit
                </span>
                <p className="mt-1 text-[13px] font-bold leading-snug">{settings.address_line1}</p>
                <p className="text-[11px] text-white/70">
                  {settings.address_line2}, {settings.city}
                </p>
              </div>
            </div>
          </Tile>
        </div>

        {/* ------------------------------- shop --------------------------- */}
        <section id="d-shop" className="mt-10 scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold tracking-tight">
              In stock today
              <span className="ml-2 font-deva text-[13px] font-normal text-d-mute">आज उपलब्ध</span>
            </h2>
            <span className="text-[12px] text-d-mute">{visible.length} items</span>
          </div>

          <div className="relative mt-4 md:hidden">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-d-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search the catalogue"
              className="w-full rounded-xl border border-d-line bg-d-tile py-3 pl-10 pr-3 text-sm outline-none focus:border-d-electric"
            />
          </div>

          <div className="no-sb mt-4 flex gap-2 overflow-x-auto pb-1">
            {[{ category: 'all', n: products.length }, ...facets.categories].map((c) => {
              const active = category === c.category
              return (
                <button
                  key={c.category}
                  onClick={() => setCategory(c.category)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition active:scale-[0.97] ${
                    active ? 'bg-d-ink text-white' : 'border border-d-line bg-d-tile text-d-mute hover:text-d-ink'
                  }`}
                >
                  {c.category === 'all' ? 'Everything' : CATEGORY_LABELS[c.category] || c.category}
                  <span className={`ml-1.5 text-[11px] ${active ? 'text-white/55' : 'text-d-mute/70'}`}>{c.n}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="ph h-64 rounded-2xl" />)
              : visible.map((p, i) => (
                  <DukaanCard key={p.id} product={p} index={i} settings={settings} onOpen={() => setOpen(p)} />
                ))}
          </div>

          {!loading && visible.length === 0 && (
            <p className="mt-10 rounded-2xl border border-dashed border-d-line py-14 text-center text-sm text-d-mute">
              Nothing matches that. Call us — we can usually arrange a model within 48 hours.
            </p>
          )}
        </section>

        {/* ------------------------------ reviews -------------------------- */}
        <section className="mt-12">
          <h2 className="text-xl font-extrabold tracking-tight">
            What Ranchi says
            <span className="ml-2 font-deva text-[13px] font-normal text-d-mute">ग्राहकों की राय</span>
          </h2>
          <div className="no-sb mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {reviews.slice(0, 6).map((r) => (
              <figure
                key={r.id}
                className="w-[80%] shrink-0 snap-start rounded-2xl border border-d-line bg-d-tile p-4 md:w-auto"
              >
                <div className="text-[12px] text-d-marigold">{'★'.repeat(r.rating)}</div>
                <blockquote className="mt-2 text-[13px] font-bold leading-snug">{r.title || r.name}</blockquote>
                <p className="mt-1.5 text-[12px] leading-relaxed text-d-mute">
                  {r.message.length > 120 ? `${r.message.slice(0, 120)}…` : r.message}
                </p>
                <figcaption className="mt-3 border-t border-d-line pt-3 text-[11px] font-semibold text-d-mute">
                  {r.name} · {r.city}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>

      {/* --------------------------- bottom tab bar ----------------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-d-line bg-d-tile/97 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <a
                key={t.key}
                href={t.key === 'call' ? `tel:${(settings.phone_primary || '').replace(/\s/g, '')}` : '#d-shop'}
                onClick={() => setTab(t.key)}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
              >
                {active && (
                  <motion.span
                    layoutId="d-tab"
                    className="absolute inset-x-3 top-1 h-9 rounded-xl bg-d-electric/10"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <t.icon size={18} className={`relative ${active ? 'text-d-electric' : 'text-d-mute'}`} />
                <span className={`relative text-[10px] font-bold ${active ? 'text-d-electric' : 'text-d-mute'}`}>
                  {t.label}
                </span>
              </a>
            )
          })}
        </div>
      </nav>

      <AnimatePresence>
        {open && <DukaanDetail product={open} settings={settings} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  )
}

function Tile({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay, ease: EASE }}
      className={`rounded-2xl border border-d-line bg-d-tile p-4 ${className}`}
    >
      {children}
    </motion.section>
  )
}

/** The real lookup is CAPTCHA-protected server-side; this tile hands off. */
function TrackTile() {
  const [ticket, setTicket] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setSent(true)
        window.setTimeout(() => setSent(false), 2200)
      }}
      className="mt-3 flex gap-2"
    >
      <input
        value={ticket}
        onChange={(e) => setTicket(e.target.value.toUpperCase())}
        placeholder="VMS-7K4PQ2"
        aria-label="Ticket number"
        className="min-w-0 flex-1 rounded-xl border border-d-line bg-d-canvas px-3 py-2.5 font-mono text-[13px] outline-none transition focus:border-d-electric focus:bg-white"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-d-ink px-4 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.97]"
      >
        {sent ? <Check size={16} /> : <ArrowRight size={16} />}
      </button>
      {sent && (
        <span className="sr-only" role="status">
          Hands off to the CAPTCHA-protected tracking page
        </span>
      )}
    </form>
  )
}

/* ------------------------------- card -------------------------------- */

function DukaanCard({
  product,
  index,
  settings,
  onOpen,
}: {
  product: Product
  index: number
  settings: Settings
  onOpen: () => void
}) {
  const [reserved, setReserved] = useState(false)
  const timer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const availability =
    product.availability === 'in_stock'
      ? 'bg-d-jade/12 text-d-jade'
      : product.availability === 'low_stock'
        ? 'bg-d-marigold/18 text-[#8a5c02]'
        : 'bg-black/8 text-d-mute'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: stagger(index, 0.035), ease: EASE }}
      className="flex flex-col overflow-hidden rounded-2xl border border-d-line bg-d-tile"
    >
      <button onClick={onOpen} className="group text-left active:scale-[0.99]" aria-label={`Open ${product.name}`}>
        <div className="relative bg-d-canvas">
          <SmartImg
            src={product.image_url}
            alt={product.name}
            className="aspect-[4/3] w-full"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {product.discount > 0 && (
            <span className="absolute left-2 top-2 rounded-lg bg-d-marigold px-2 py-0.5 text-[11px] font-extrabold text-d-ink">
              {product.discount}% off
            </span>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-bold uppercase tracking-wide text-d-mute">{product.brand}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${availability}`}>
              {AVAILABILITY_LABELS[product.availability]}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug">{product.name}</h3>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-base font-extrabold">{money(product.price)}</span>
            {product.mrp > product.price && (
              <span className="text-[11px] text-d-mute line-through">{money(product.mrp)}</span>
            )}
          </div>
        </div>
      </button>

      {/* The reserve action is this shop's add-to-cart: optimistic tick,
          then straight into WhatsApp with the item pre-filled. */}
      <a
        href={whatsapp(settings, `Hi! Is the ${product.name} (${product.sku}) available?`)}
        target="_blank"
        rel="noreferrer noopener"
        onClick={() => {
          setReserved(true)
          timer.current = window.setTimeout(() => setReserved(false), 1800)
        }}
        className={`mt-auto flex items-center justify-center gap-1.5 border-t border-d-line py-2.5 text-[12px] font-bold transition active:scale-[0.98] ${
          reserved ? 'bg-d-jade text-white' : 'text-d-electric hover:bg-d-electric/6'
        }`}
      >
        {reserved ? (
          <>
            <Check size={14} /> Asking the shop…
          </>
        ) : (
          <>
            <MessageCircle size={14} /> Reserve on WhatsApp
          </>
        )}
      </a>
    </motion.article>
  )
}

/* ------------------------------ detail ------------------------------- */

function DukaanDetail({ product, settings, onClose }: { product: Product; settings: Settings; onClose: () => void }) {
  const frames = galleryFor(product)
  const [frame, setFrame] = useState(0)
  const strip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  /** Keeps the dot indicator honest when the strip is swiped by thumb. */
  function onScroll() {
    const el = strip.current
    if (!el) return
    setFrame(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] overflow-y-auto bg-d-canvas font-dukaan text-d-ink"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22, ease: EASE }}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-d-line bg-d-tile/95 px-4 py-3 backdrop-blur sm:px-6">
        <span className="text-[12px] font-bold text-d-mute">
          {CATEGORY_LABELS[product.category] || product.category}
        </span>
        <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-black/5" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-36 pt-5 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:pb-16">
        <div>
          <div
            ref={strip}
            onScroll={onScroll}
            className="no-sb flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-d-line bg-d-tile"
          >
            {frames.map((f) => (
              <SmartImg
                key={f.src}
                src={f.src}
                alt={`${product.name} — ${f.label}`}
                className="aspect-square w-full shrink-0 snap-center"
                priority
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {frames.map((f, i) => (
                <button
                  key={f.src}
                  onClick={() => strip.current?.scrollTo({ left: i * (strip.current?.clientWidth ?? 0), behavior: 'smooth' })}
                  aria-label={f.label}
                  className={`h-1.5 rounded-full transition-all ${i === frame ? 'w-6 bg-d-electric' : 'w-1.5 bg-d-line'}`}
                />
              ))}
            </div>
            <span className="text-[11px] text-d-mute">
              {frames[frame]?.label}
              {frames[frame] && !frames[frame].isReal && ' · placeholder'}
            </span>
          </div>
        </div>

        <div className="mt-6 lg:mt-0">
          <span className="text-[11px] font-bold uppercase tracking-wide text-d-mute">{product.brand}</span>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-2.5">
            <span className="text-3xl font-extrabold">{money(product.price)}</span>
            {product.mrp > product.price && (
              <>
                <span className="text-base text-d-mute line-through">{money(product.mrp)}</span>
                <span className="rounded-lg bg-d-jade/12 px-2 py-0.5 text-[12px] font-bold text-d-jade">
                  Save {money(product.mrp - product.price)}
                </span>
              </>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-d-mute">Inclusive of all taxes · GST invoice provided</p>

          <p className="mt-5 text-[14px] leading-relaxed text-d-mute">{product.description}</p>

          {product.specs.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.specs.map((spec) => (
                <span
                  key={spec}
                  className="rounded-xl border border-d-line bg-d-tile px-3 py-2 text-[12px] font-semibold"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}

          <div className="mt-7 grid grid-cols-3 gap-2 text-center">
            {['Brand warranty', 'Same-day pickup', 'Exchange accepted'].map((t) => (
              <div key={t} className="rounded-xl border border-d-line bg-d-tile p-3 text-[11px] font-semibold text-d-mute">
                {t}
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-7 flex w-full items-center justify-between rounded-xl border border-d-line bg-d-tile px-4 py-3 text-[13px] font-bold transition hover:border-d-electric"
          >
            Back to the catalogue <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Thumb-reachable actions that follow the page. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-d-line bg-d-tile/97 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <a
            href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-d-line py-3 text-[13px] font-bold transition active:scale-[0.98]"
          >
            <Phone size={16} /> Call
          </a>
          <a
            href={whatsapp(settings, `Hi! Is the ${product.name} (${product.sku}) available?`)}
            target="_blank"
            rel="noreferrer noopener"
            className="flex flex-[1.6] items-center justify-center gap-2 rounded-xl bg-d-electric py-3 text-[13px] font-bold text-white transition active:scale-[0.98]"
          >
            <MessageCircle size={16} /> Reserve on WhatsApp
          </a>
        </div>
      </div>
    </motion.div>
  )
}
