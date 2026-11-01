import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, X, Phone, MessageCircle, Wrench, Search } from 'lucide-react'
import {
  useShopData, galleryFor, money, stagger, EASE, CATEGORY_LABELS, AVAILABILITY_LABELS,
  type Product, type Settings,
} from '@/lib/data'
import SmartImg from '@/shell/SmartImg'

/* ------------------------------------------------------------------ *
 * COUNTER
 *
 * Premium, editorial, near-monochrome. No cards, no glass, one hairline.
 * The signature is chapter inversion: the page theme flips light to dark
 * as each chapter takes the viewport, so the catalogue reads as a
 * sequence of spreads rather than a scroll of boxes.
 * ------------------------------------------------------------------ */

type Tone = 'light' | 'dark'

const SERVICES = [
  { n: '01', title: 'Screen replacement', time: '60–90 min', price: 'from ₹1,499' },
  { n: '02', title: 'Battery replacement', time: '30–45 min', price: 'from ₹899' },
  { n: '03', title: 'Charging port repair', time: '45–60 min', price: 'from ₹699' },
  { n: '04', title: 'Water damage rescue', time: '24–48 hrs', price: 'from ₹1,200' },
  { n: '05', title: 'Motherboard repair', time: '2–4 days', price: 'on diagnosis' },
  { n: '06', title: 'Data recovery', time: '4–24 hrs', price: 'from ₹999' },
]

const CATEGORIES = [
  { key: 'smartphone', label: 'Smartphones', photo: '/shop/shop-02.jpg' },
  { key: 'audio', label: 'Audio', photo: '/shop/shop-09.jpg' },
  { key: 'wearable', label: 'Smartwatches', photo: '/shop/shop-14.jpg' },
  { key: 'accessory', label: 'Accessories', photo: '/shop/shop-06.jpg' },
]

function whatsapp(s: Settings, msg: string) {
  return `https://wa.me/${s.whatsapp || ''}?text=${encodeURIComponent(msg)}`
}

/** One full chapter. Registers its tone so the page can invert around it. */
function Chapter({
  tone,
  id,
  onTone,
  className = '',
  children,
}: {
  tone: Tone
  id: string
  onTone: (t: Tone) => void
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onTone(tone),
      // Only the band through the middle of the viewport counts, so the
      // flip happens once a chapter genuinely owns the screen.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [tone, onTone])

  return (
    <section ref={ref} id={id} className={`relative px-5 py-24 sm:px-10 sm:py-36 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

function Rise({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15%' }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

export default function Counter() {
  const { products, reviews, settings, stats, loading } = useShopData()
  const [tone, setTone] = useState<Tone>('light')
  const [open, setOpen] = useState<Product | null>(null)

  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])
  const heroFade = useTransform(scrollYProgress, [0, 0.85], [1, 0])

  const dark = tone === 'dark'
  const picks = products.filter((p) => p.featured).slice(0, 8)
  const grid = (picks.length ? picks : products).slice(0, 8)

  return (
    <div
      className={`counter-root min-h-screen font-body ${dark ? 'bg-c-ink text-c-paper' : 'bg-c-paper text-c-ink'}`}
    >
      {/* ------------------------------- nav ------------------------------ */}
      <header className="sticky top-0 z-40">
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-10 ${
            dark ? 'border-c-hair-inv' : 'border-c-hair'
          }`}
        >
          <span className="font-counter text-sm font-bold tracking-tight">
            Vaishnavi<span className={dark ? 'text-c-paper/40' : 'text-c-graphite'}> Mobile Point</span>
          </span>
          <nav className="hidden items-center gap-8 text-[13px] font-medium sm:flex">
            {['Shop', 'Repairs', 'Track', 'Visit'].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="transition-opacity hover:opacity-55">
                {l}
              </a>
            ))}
          </nav>
          <a
            href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
              dark ? 'border-c-hair-inv hover:bg-white/10' : 'border-c-hair hover:bg-black/5'
            }`}
          >
            {settings.phone_primary || 'Call'}
          </a>
        </div>
      </header>

      {/* ------------------------------ hero ------------------------------ */}
      <div ref={heroRef}>
        <Chapter tone="light" id="home" onTone={setTone} className="!pt-10">
          <motion.div style={{ opacity: heroFade }}>
            <motion.p
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-c-graphite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              Ratu Road, Ranchi — since {settings.established || '2005'}
            </motion.p>

            <motion.h1
              className="mt-7 max-w-4xl font-counter text-[clamp(2.6rem,8vw,7.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: EASE }}
            >
              Every phone you want.
              <br />
              <span className="text-c-graphite">Every repair you need.</span>
            </motion.h1>

            {/* Both doors open together — staggering them would rank one. */}
            <motion.div
              className="mt-10 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.18, ease: EASE }}
            >
              <a
                href="#repairs"
                className="inline-flex items-center gap-2 rounded-full bg-c-ink px-7 py-4 text-sm font-semibold text-c-paper transition hover:opacity-85 active:scale-[0.98]"
              >
                <Wrench size={16} /> Book a repair
              </a>
              <a
                href="#shop"
                className="inline-flex items-center gap-2 rounded-full border border-c-hair px-7 py-4 text-sm font-semibold transition hover:bg-black/5 active:scale-[0.98]"
              >
                Browse phones <ArrowRight size={16} />
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-16 overflow-hidden rounded-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.24 }}
          >
            <motion.div style={{ scale: heroScale }}>
              <SmartImg
                src="/shop/storefront-graded.jpg"
                alt="The Vaishnavi Mobile Point storefront on Ratu Road"
                className="aspect-[16/10] w-full sm:aspect-[21/9]"
                priority
              />
            </motion.div>
          </motion.div>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-c-hair pt-8">
            {[
              [settings.stats_customers || '24000', 'Customers served'],
              [settings.stats_repairs || '38500', 'Repairs completed'],
              [String(stats?.rating ?? 4.8), 'Average rating'],
            ].map(([v, l], i) => (
              <Rise key={l} delay={stagger(i)}>
                <div className="font-counter text-3xl font-bold tracking-tight sm:text-5xl">
                  {Number(v) > 1000 ? `${Math.round(Number(v) / 1000)}k+` : v}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-c-graphite">{l}</div>
              </Rise>
            ))}
          </div>
        </Chapter>
      </div>

      {/* ---------------------------- the shelves -------------------------- */}
      <Chapter tone="dark" id="shop" onTone={setTone} className="bg-c-ink text-c-paper">
        <Rise>
          <h2 className="max-w-3xl font-counter text-[clamp(2rem,5vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            The shelves
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-c-paper/55">
            Sealed stock, GST invoice, brand warranty. {products.length} items on the floor today.
          </p>
        </Rise>

        <div className="mt-16 divide-y divide-c-hair-inv border-y border-c-hair-inv">
          {CATEGORIES.map((cat, i) => {
            const n = products.filter((p) => p.category === cat.key).length
            return (
              <Rise key={cat.key} delay={stagger(i)}>
                <a href="#picks" className="group flex items-center gap-6 py-7 transition-opacity hover:opacity-100">
                  <span className="w-10 shrink-0 font-mono text-xs text-c-paper/35">0{i + 1}</span>
                  <SmartImg
                    src={cat.photo}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded-sm grayscale transition duration-700 group-hover:grayscale-0 sm:h-20 sm:w-36"
                  />
                  <span className="min-w-0 flex-1 font-counter text-2xl font-bold tracking-tight sm:text-4xl">
                    {cat.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-c-paper/40">{n} in stock</span>
                  <ArrowRight
                    size={20}
                    className="shrink-0 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </a>
              </Rise>
            )
          })}
        </div>
      </Chapter>

      {/* ------------------------------ picks ------------------------------ */}
      <Chapter tone="light" id="picks" onTone={setTone}>
        <Rise>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h2 className="font-counter text-[clamp(2rem,5vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              This week
            </h2>
            <span className="text-[11px] uppercase tracking-[0.16em] text-c-graphite">
              Tap any item for the full detail view
            </span>
          </div>
        </Rise>

        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="ph aspect-[4/5] rounded-sm" />)
            : grid.map((product, i) => (
                <Rise key={product.id} delay={stagger(i % 4)}>
                  <button onClick={() => setOpen(product)} className="group block w-full text-left">
                    <div className="overflow-hidden rounded-sm bg-black/[0.03]">
                      <SmartImg
                        src={product.image_url}
                        alt={product.name}
                        className="aspect-square w-full"
                        imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
                      />
                    </div>
                    {/* The rule draws rather than lights up — the only hover cue. */}
                    <span className="mt-5 block h-px w-full bg-c-hair">
                      <span className="block h-px w-0 bg-c-ink transition-all duration-500 ease-out group-hover:w-full" />
                    </span>
                    <span className="mt-4 flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-c-graphite">{product.brand}</span>
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background:
                            product.availability === 'in_stock'
                              ? '#0e8a5f'
                              : product.availability === 'low_stock'
                                ? '#b4790a'
                                : '#ad3129',
                        }}
                        title={AVAILABILITY_LABELS[product.availability]}
                      />
                    </span>
                    <span className="mt-1.5 block font-counter text-[15px] font-semibold leading-snug">
                      {product.name}
                    </span>
                    <span className="mt-1.5 block font-mono text-sm text-c-graphite">{money(product.price)}</span>
                  </button>
                </Rise>
              ))}
        </div>
      </Chapter>

      {/* ----------------------------- the bench --------------------------- */}
      <Chapter tone="dark" id="repairs" onTone={setTone} className="bg-c-ink text-c-paper">
        <Rise>
          <h2 className="max-w-3xl font-counter text-[clamp(2rem,5vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            The bench
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-c-paper/55">
            Chip-level work the authorised centres usually refuse. A written estimate before a single screw turns.
          </p>
        </Rise>

        <div className="mt-16 grid gap-x-16 gap-y-0 sm:grid-cols-2">
          {SERVICES.map((s, i) => (
            <Rise key={s.n} delay={stagger(i)}>
              <div className="flex items-baseline gap-5 border-b border-c-hair-inv py-6">
                <span className="font-mono text-[11px] text-c-paper/35">{s.n}</span>
                <span className="flex-1 font-counter text-lg font-semibold tracking-tight">{s.title}</span>
                <span className="hidden font-mono text-[11px] text-c-paper/40 sm:block">{s.time}</span>
                <span className="font-mono text-[11px] text-c-paper/70">{s.price}</span>
              </div>
            </Rise>
          ))}
        </div>

        <Rise delay={0.1}>
          <div className="mt-14 flex flex-wrap gap-3">
            <a
              href="#track"
              className="inline-flex items-center gap-2 rounded-full bg-c-paper px-7 py-4 text-sm font-semibold text-c-ink transition hover:opacity-85 active:scale-[0.98]"
            >
              <Wrench size={16} /> Book a repair
            </a>
            <a
              href="#track"
              className="inline-flex items-center gap-2 rounded-full border border-c-hair-inv px-7 py-4 text-sm font-semibold transition hover:bg-white/10 active:scale-[0.98]"
            >
              <Search size={16} /> Track a ticket
            </a>
          </div>
        </Rise>
      </Chapter>

      {/* ----------------------------- in their words ---------------------- */}
      <Chapter tone="light" id="track" onTone={setTone}>
        <Rise>
          <h2 className="font-counter text-[clamp(2rem,5vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            In their words
          </h2>
        </Rise>
        <div className="mt-14 grid gap-12 md:grid-cols-3">
          {reviews.slice(0, 3).map((r, i) => (
            <Rise key={r.id} delay={stagger(i)}>
              <figure>
                <blockquote className="font-counter text-xl font-medium leading-snug tracking-tight">
                  “{r.title || r.message.slice(0, 70)}”
                </blockquote>
                <p className="mt-4 text-[13px] leading-relaxed text-c-graphite">
                  {r.message.length > 170 ? `${r.message.slice(0, 170)}…` : r.message}
                </p>
                <figcaption className="mt-6 border-t border-c-hair pt-4 text-[11px] uppercase tracking-[0.14em] text-c-graphite">
                  {r.name} — {r.city} · {'★'.repeat(r.rating)}
                </figcaption>
              </figure>
            </Rise>
          ))}
        </div>
      </Chapter>

      {/* ------------------------------- visit ----------------------------- */}
      <Chapter tone="dark" id="visit" onTone={setTone} className="bg-c-ink text-c-paper">
        <Rise>
          <h2 className="max-w-3xl font-counter text-[clamp(2rem,5vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            Churi Centre Gali,
            <br />
            <span className="text-c-paper/45">opposite Galaxia Mall.</span>
          </h2>
          <div className="mt-10 grid gap-8 text-sm sm:grid-cols-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-c-paper/35">Address</div>
              <p className="mt-2 leading-relaxed text-c-paper/70">
                {settings.address_line1}
                <br />
                {settings.address_line2}
                <br />
                {settings.city} {settings.pincode}
              </p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-c-paper/35">Hours</div>
              <p className="mt-2 leading-relaxed text-c-paper/70">
                Mon–Sat {settings.hours_weekday}
                <br />
                Sunday {settings.hours_sunday}
              </p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-c-paper/35">Call</div>
              <p className="mt-2 leading-relaxed text-c-paper/70">
                {settings.phone_primary}
                <br />
                {settings.phone_secondary}
              </p>
            </div>
          </div>
        </Rise>
      </Chapter>

      <AnimatePresence>
        {open && <CounterDetail product={open} settings={settings} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Detail — editorial spread, sticky image column.
 * ------------------------------------------------------------------ */

function CounterDetail({
  product,
  settings,
  onClose,
}: {
  product: Product
  settings: Settings
  onClose: () => void
}) {
  const frames = galleryFor(product)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const active = frames[frame]

  return (
    <motion.div
      className="fixed inset-0 z-[200] overflow-y-auto bg-c-paper text-c-ink"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: EASE }}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-c-hair bg-c-paper/90 px-5 py-4 backdrop-blur sm:px-10">
        <span className="text-[11px] uppercase tracking-[0.16em] text-c-graphite">
          {CATEGORY_LABELS[product.category] || product.category}
        </span>
        <button onClick={onClose} className="rounded-full p-2 transition hover:bg-black/5" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:px-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.src}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.38, ease: EASE }}
            >
              <SmartImg src={active.src} alt={product.name} className="aspect-square w-full rounded-sm bg-black/[0.03]" priority />
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex items-center gap-3">
            {frames.map((f, i) => (
              <button
                key={f.src}
                onClick={() => setFrame(i)}
                className={`relative h-16 w-16 overflow-hidden rounded-sm transition ${
                  i === frame ? 'ring-1 ring-c-ink' : 'opacity-50 hover:opacity-90'
                }`}
                aria-label={f.label}
                aria-current={i === frame}
              >
                <SmartImg src={f.src} alt="" className="h-full w-full" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-c-graphite">
            {active.label}
            {!active.isReal && ' · placeholder frame — one photo per product in the database'}
          </p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-c-graphite">{product.brand}</p>
          <h1 className="mt-4 font-counter text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
            {product.name}
          </h1>
          <p className="mt-6 font-mono text-2xl">{money(product.price)}</p>
          {product.mrp > product.price && (
            <p className="mt-1 font-mono text-sm text-c-graphite">
              <span className="line-through">{money(product.mrp)}</span> · save {product.discount}%
            </p>
          )}

          <p className="mt-8 max-w-prose text-[15px] leading-relaxed text-c-graphite">{product.description}</p>

          {product.specs.length > 0 && (
            <dl className="mt-10 border-t border-c-hair">
              {product.specs.map((spec) => (
                <div key={spec} className="flex gap-6 border-b border-c-hair py-4 text-sm">
                  <dt className="w-24 shrink-0 text-[11px] uppercase tracking-[0.14em] text-c-graphite">Spec</dt>
                  <dd>{spec}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-10 rounded-sm bg-c-ink p-7 text-c-paper">
            <h2 className="font-counter text-lg font-bold tracking-tight">Reserve it over the phone</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-c-paper/55">
              We hold stock at the counter rather than selling online. Call or WhatsApp and we will keep this aside
              today.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 rounded-full bg-c-paper px-6 py-3.5 text-sm font-semibold text-c-ink transition hover:opacity-85 active:scale-[0.98]"
              >
                <Phone size={16} /> {settings.phone_primary}
              </a>
              <a
                href={whatsapp(settings, `Hi! Is the ${product.name} (${product.sku}) available?`)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-full border border-c-hair-inv px-6 py-3.5 text-sm font-semibold transition hover:bg-white/10 active:scale-[0.98]"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
