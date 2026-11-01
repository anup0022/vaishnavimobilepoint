import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { X, Phone, MessageCircle, ChevronLeft, ChevronRight, Cpu, BatteryCharging, Smartphone } from 'lucide-react'
import {
  useShopData, galleryFor, money, useReducedMotion, AVAILABILITY_LABELS, CATEGORY_LABELS,
  type Product, type Settings,
} from '@/lib/data'
import SmartImg from '@/shell/SmartImg'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------------------------------------------------ *
 * BENCH
 *
 * Dark studio, warm key and cold rim. The signature is the teardown:
 * one pinned scene in which a phone separates into the parts this shop
 * actually repairs, each labelled with its real service time and price.
 *
 * This is the only direction that adds GSAP, and only because every
 * scene here is pinned — the one thing the existing motion spec says
 * Framer Motion does badly.
 * ------------------------------------------------------------------ */

const LAYERS = [
  { key: 'display', icon: Smartphone, title: 'Screen replacement', time: '60–90 min', price: 'from ₹1,499', note: 'Original and service-pack displays, fresh waterproof adhesive.' },
  { key: 'battery', icon: BatteryCharging, title: 'Battery replacement', time: '30–45 min', price: 'from ₹899', note: 'Full-capacity cells with a health report before and after.' },
  { key: 'board', icon: Cpu, title: 'Motherboard repair', time: '2–4 days', price: 'on diagnosis', note: 'Chip-level work the authorised centres usually refuse.' },
]

const TICKET_FLOW = ['received', 'diagnosing', 'awaiting parts', 'repairing', 'ready', 'delivered']

function whatsapp(s: Settings, msg: string) {
  return `https://wa.me/${s.whatsapp || ''}?text=${encodeURIComponent(msg)}`
}

export default function Bench() {
  const { products, reviews, settings, stats, loading } = useShopData()
  const calm = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<Product | null>(null)

  const hero = products.find((p) => p.featured && p.category === 'smartphone') ?? products[0]
  const grid = products.filter((p) => p.category === 'smartphone').slice(0, 6)

  useLayoutEffect(() => {
    if (!products.length) return

    const mm = gsap.matchMedia(root)

    // Pinning is desktop-only. On a phone the scene would trap the thumb,
    // and the compositing cost lands on exactly the budget hardware this
    // shop's customers carry.
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.to('[data-bench="hero-device"]', {
        rotateY: 26,
        rotateX: -8,
        scale: 0.82,
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: '[data-bench="scene-hero"]', start: 'top top', end: 'bottom top', scrub: 0.6 },
      })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '[data-bench="scene-teardown"]',
          start: 'top top',
          end: '+=1600',
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
        },
      })

      tl.to('[data-layer="display"]', { yPercent: -62, rotateX: 52, duration: 1 }, 0)
        .to('[data-layer="battery"]', { yPercent: -6, rotateX: 52, duration: 1 }, 0)
        .to('[data-layer="board"]', { yPercent: 52, rotateX: 52, duration: 1 }, 0)
        .to('[data-bench="stack-hint"]', { opacity: 0, duration: 0.2 }, 0)
        // The callouts are content, not decoration, so they are never hidden —
        // only the accent rail animates. Hiding them would reproduce the
        // failure in docs/homepage-motion-spec.md, where a trigger that never
        // fires leaves text permanently invisible and nothing errors.
        .fromTo(
          '[data-callout-rail]',
          { scaleY: 0 },
          { scaleY: 1, transformOrigin: 'top center', stagger: 0.18, duration: 0.5 },
          0.25,
        )

      // `.from()` applies its start state immediately, so a trigger that never
      // fires would leave the grid at opacity 0. immediateRender defers it.
      gsap.from('[data-bench="card"]', {
        y: 36,
        opacity: 0,
        duration: 0.5,
        stagger: { each: 0.06, amount: 0.3 },
        ease: 'power2.out',
        immediateRender: false,
        scrollTrigger: { trigger: '[data-bench="scene-catalogue"]', start: 'top 72%' },
      })

      gsap.from('[data-bench="rail-step"]', {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
        immediateRender: false,
        scrollTrigger: { trigger: '[data-bench="scene-ticket"]', start: 'top 70%' },
      })
    })

    // Web fonts change text metrics, which moves every trigger point.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => mm.revert()
  }, [products.length])

  return (
    <div ref={root} className="min-h-screen bg-b-obsidian font-bench text-white">
      {/* ------------------------------- dock ----------------------------- */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center p-4">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-b-edge bg-b-slate/85 p-1.5 backdrop-blur-xl">
          <span className="px-4 text-xs font-bold tracking-wide">VMP</span>
          <span className="h-5 w-px bg-b-edge" />
          {['Bench', 'Shop', 'Ticket'].map((l, i) => (
            <a
              key={l}
              href={`#bench-${i}`}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                i === 0 ? 'bg-b-key text-b-obsidian' : 'text-b-mist hover:bg-white/5 hover:text-white'
              }`}
            >
              {l}
            </a>
          ))}
          <a
            href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`}
            className="ml-1 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold transition hover:bg-white/20"
          >
            Call
          </a>
        </div>
      </header>

      {/* ------------------------------ scene 1 --------------------------- */}
      <section
        id="bench-0"
        data-bench="scene-hero"
        className="relative flex min-h-screen items-center overflow-hidden px-5 pb-20 pt-28 sm:px-10"
      >
        {/* key + rim, the two lights the whole concept is built on */}
        <div className="pointer-events-none absolute -left-40 top-0 h-[70vh] w-[70vh] rounded-full bg-b-key/14 blur-[120px]" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[60vh] w-[60vh] rounded-full bg-b-rim/18 blur-[120px]" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-b-edge px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-b-mist">
              <span className="h-1.5 w-1.5 rounded-full bg-b-signal" />
              In-house repair bench · Ranchi
            </span>
            <h1 className="mt-7 font-bench text-[clamp(2.4rem,6.5vw,5.2rem)] font-bold leading-[0.98] tracking-[-0.03em]">
              We open phones
              <br />
              <span className="text-b-key">other shops send away.</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-b-mist">
              {settings.about_lead ||
                'Chip-level diagnostics, genuine spares and a written warranty slip with every job.'}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#bench-1"
                className="rounded-xl bg-b-key px-6 py-3.5 text-sm font-bold text-b-obsidian transition hover:brightness-110 active:scale-[0.98]"
              >
                See the teardown
              </a>
              <a
                href="#bench-2"
                className="rounded-xl border border-b-edge px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5 active:scale-[0.98]"
              >
                Browse stock
              </a>
            </div>

            <dl className="mt-11 grid max-w-md grid-cols-3 gap-5 border-t border-b-edge pt-7 font-mono">
              {[
                [settings.stats_repairs || '38500', 'repairs'],
                [String(stats?.products ?? 0), 'in stock'],
                [`${stats?.rating ?? 4.8}★`, 'rating'],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-xl font-bold text-white sm:text-2xl">
                    {Number(v) > 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : v}
                  </dt>
                  <dd className="mt-1 text-[10px] uppercase tracking-[0.14em] text-b-mist">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative [perspective:1400px]">
            <div data-bench="hero-device" className="relative mx-auto w-[min(78vw,340px)] [transform-style:preserve-3d]">
              <div className="absolute -inset-8 rounded-[3rem] bg-b-rim/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-b-edge bg-b-slate shadow-2xl">
                {hero ? (
                  <SmartImg src={hero.image_url} alt={hero.name} className="aspect-[3/4] w-full" priority />
                ) : (
                  <div className="ph aspect-[3/4] w-full" />
                )}
              </div>
              {hero && (
                <div className="absolute -bottom-5 left-1/2 w-max -translate-x-1/2 rounded-xl border border-b-edge bg-b-slate/95 px-4 py-2.5 backdrop-blur">
                  <div className="text-xs font-semibold">{hero.name}</div>
                  <div className="font-mono text-[11px] text-b-key">{money(hero.price)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ scene 2 --------------------------- */}
      <section
        id="bench-1"
        data-bench="scene-teardown"
        className="relative flex min-h-screen items-center overflow-hidden px-5 py-20 sm:px-10"
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-b-key/8 blur-[130px]" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[0.9fr_1fr]">
          <div className="relative mx-auto h-[420px] w-[200px] [perspective:1200px] sm:h-[460px] sm:w-[260px]">
            <div className="relative h-full w-full [transform-style:preserve-3d]">
              <Layer
                tag="display"
                className="max-md:-translate-y-[28%] max-md:scale-[0.78] border-b-rim/50 bg-gradient-to-b from-b-rim/25 to-b-slate"
              >
                {hero && <SmartImg src={hero.image_url} alt="" className="h-full w-full opacity-80" />}
              </Layer>
              <Layer
                tag="battery"
                className="max-md:scale-[0.78] border-b-key/40 bg-gradient-to-b from-b-key/20 to-b-slate"
              >
                <div className="flex h-full items-center justify-center">
                  <div className="h-3/5 w-3/5 rounded-lg border border-b-key/50 bg-b-key/10" />
                </div>
              </Layer>
              <Layer
                tag="board"
                className="max-md:translate-y-[28%] max-md:scale-[0.78] border-b-signal/35 bg-gradient-to-b from-b-signal/12 to-b-slate"
              >
                <div
                  className="h-full w-full opacity-60"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, rgb(53 224 161 / .28) 1px, transparent 1px), linear-gradient(rgb(53 224 161 / .28) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />
              </Layer>
            </div>

            <div
              data-bench="stack-hint"
              className="absolute -bottom-8 left-1/2 w-max -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-b-mist"
            >
              {/* Below 768px the scene is never pinned, so the layers ship
                  already separated and the label must not promise a gesture
                  that does nothing. */}
              <span className="md:hidden">Three repairable layers</span>
              <span className="hidden md:inline">{calm ? 'Three repairable layers' : 'Scroll to separate'}</span>
            </div>
          </div>

          <div>
            <h2 className="font-bench text-[clamp(1.8rem,4.5vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.03em]">
              What we actually
              <br />
              <span className="text-b-key">open up.</span>
            </h2>

            <div className="mt-9 space-y-3">
              {LAYERS.map((l) => (
                <div
                  key={l.key}
                  className="relative flex gap-4 overflow-hidden rounded-2xl border border-b-edge bg-b-slate/60 p-4"
                >
                  <span
                    data-callout-rail
                    className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-b-key to-b-rim"
                  />
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-b-key">
                    <l.icon size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="text-sm font-bold">{l.title}</h3>
                      <span className="font-mono text-xs text-b-key">{l.price}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-b-mist">{l.note}</p>
                    <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-b-mist/70">
                      {l.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ scene 3 --------------------------- */}
      <section id="bench-2" data-bench="scene-catalogue" className="relative px-5 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-bench text-[clamp(1.8rem,4.5vw,3.4rem)] font-bold tracking-[-0.03em]">
              On the shelf
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-b-mist">
              Tap a device for the orbit view
            </span>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="ph h-80 rounded-2xl" />)
              : grid.map((p) => <BenchCard key={p.id} product={p} onOpen={() => setOpen(p)} calm={calm} />)}
          </div>
        </div>
      </section>

      {/* ------------------------------ scene 4 --------------------------- */}
      <section id="bench-3" data-bench="scene-ticket" className="relative px-5 py-24 sm:px-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-b-edge bg-b-slate/50 p-7 sm:p-12">
          <h2 className="font-bench text-[clamp(1.6rem,4vw,2.6rem)] font-bold tracking-[-0.03em]">
            Your ticket, live.
          </h2>
          <p className="mt-3 text-sm text-b-mist">
            Every repair gets a code like <span className="font-mono text-b-key">VMS-7K4PQ2</span>. No more calling
            five times a day.
          </p>

          <div className="mt-10 space-y-3">
            {TICKET_FLOW.map((s, i) => (
              <div key={s} className="flex items-center gap-4">
                <span className="w-7 shrink-0 font-mono text-[11px] text-b-mist">{String(i + 1).padStart(2, '0')}</span>
                <span
                  data-bench="rail-step"
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    background: i <= 3 ? 'linear-gradient(90deg,#2a7de1,#35e0a1)' : 'rgb(255 255 255 / .07)',
                  }}
                />
                <span
                  className={`w-32 shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] ${
                    i <= 3 ? 'text-white' : 'text-b-mist/50'
                  }`}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <figure key={r.id} className="rounded-2xl border border-b-edge bg-b-obsidian/60 p-4">
                <div className="font-mono text-[11px] text-b-key">{'★'.repeat(r.rating)}</div>
                <blockquote className="mt-2 text-[12px] leading-relaxed text-b-mist">
                  {r.message.length > 110 ? `${r.message.slice(0, 110)}…` : r.message}
                </blockquote>
                <figcaption className="mt-3 text-[11px] font-semibold text-white/80">{r.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-b-edge px-5 py-12 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-b-mist sm:px-10">
        {settings.address_line1} · {settings.city} · {settings.phone_primary}
      </footer>

      <AnimatePresence>
        {open && <BenchDetail product={open} settings={settings} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  )
}

function Layer({ tag, className, children }: { tag: string; className: string; children: React.ReactNode }) {
  return (
    <div
      data-layer={tag}
      className={`absolute inset-0 overflow-hidden rounded-[1.6rem] border shadow-2xl ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  )
}

/* --------------------------- catalogue card --------------------------- */

function BenchCard({ product, onOpen, calm }: { product: Product; onOpen: () => void; calm: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)

  function tilt(e: React.PointerEvent) {
    if (calm || e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateZ(0)`
  }

  function reset() {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <button
      ref={ref}
      data-bench="card"
      onPointerMove={tilt}
      onPointerLeave={reset}
      onClick={onOpen}
      className="spec-sweep group relative overflow-hidden rounded-2xl border border-b-edge bg-b-slate/55 p-4 text-left transition-[border-color,box-shadow,transform] duration-300 will-change-transform hover:border-b-rim/50 hover:shadow-[0_0_0_1px_rgb(42_125_225/.18),0_26px_60px_-28px_rgb(42_125_225/.55)] active:scale-[0.985]"
    >
      <div className="relative overflow-hidden rounded-xl bg-b-obsidian">
        <SmartImg
          src={product.image_url}
          alt={product.name}
          className="aspect-square w-full"
          imgClassName="transition-transform duration-700 group-hover:scale-105"
        />
        {product.discount > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-b-key px-2 py-0.5 font-mono text-[10px] font-bold text-b-obsidian">
            −{product.discount}%
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-b-mist">{product.brand}</span>
        <span
          className="font-mono text-[10px]"
          style={{ color: product.availability === 'in_stock' ? '#35e0a1' : product.availability === 'low_stock' ? '#f0a54a' : '#e0675d' }}
        >
          {AVAILABILITY_LABELS[product.availability]}
        </span>
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug">{product.name}</h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-lg font-bold text-white">{money(product.price)}</span>
        {product.mrp > product.price && (
          <span className="font-mono text-xs text-b-mist line-through">{money(product.mrp)}</span>
        )}
      </div>
    </button>
  )
}

/* ------------------------ detail: orbit gallery ----------------------- */

function BenchDetail({ product, settings, onClose }: { product: Product; settings: Settings; onClose: () => void }) {
  const frames = galleryFor(product)
  const [frame, setFrame] = useState(0)
  const drag = useRef<{ x: number; start: number } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setFrame((f) => (f + 1) % frames.length)
      if (e.key === 'ArrowLeft') setFrame((f) => (f - 1 + frames.length) % frames.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, frames.length])

  /** Drag scrubs through frames — the orbit gesture, without a 3D asset. */
  function onDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, start: frame }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return
    const steps = Math.round((e.clientX - drag.current.x) / 70)
    const next = (((drag.current.start - steps) % frames.length) + frames.length) % frames.length
    if (next !== frame) setFrame(next)
  }

  const active = frames[frame]

  return (
    <motion.div
      className="fixed inset-0 z-[200] overflow-y-auto bg-b-obsidian font-bench text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-b-edge bg-b-obsidian/90 px-5 py-4 backdrop-blur sm:px-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-b-mist">
          {CATEGORY_LABELS[product.category] || product.category} / {product.sku}
        </span>
        <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:px-10 lg:grid-cols-2">
        <div>
          <div
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            className="relative touch-pan-y select-none overflow-hidden rounded-3xl border border-b-edge bg-b-slate"
            style={{ cursor: 'ew-resize' }}
          >
            <div className="pointer-events-none absolute -left-20 top-0 h-full w-1/2 bg-b-key/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-0 h-full w-1/2 bg-b-rim/12 blur-3xl" />
            <AnimatePresence mode="wait">
              <motion.div
                key={active.src}
                initial={{ opacity: 0, rotateY: 14 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: -14 }}
                transition={{ duration: 0.28 }}
                className="relative"
              >
                <SmartImg src={active.src} alt={product.name} className="aspect-square w-full" priority />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
              <button
                onClick={() => setFrame((f) => (f - 1 + frames.length) % frames.length)}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/55 backdrop-blur transition hover:bg-black/75"
                aria-label="Previous frame"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="rounded-full bg-black/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] backdrop-blur">
                drag to orbit · {frame + 1}/{frames.length}
              </span>
              <button
                onClick={() => setFrame((f) => (f + 1) % frames.length)}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/55 backdrop-blur transition hover:bg-black/75"
                aria-label="Next frame"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-b-mist">
            {active.label}
            {!active.isReal && ' · placeholder frame'}
          </p>
        </div>

        <div>
          <h1 className="font-bench text-[clamp(1.8rem,4.5vw,3rem)] font-bold leading-[1.04] tracking-[-0.03em]">
            {product.name}
          </h1>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-b-key">{money(product.price)}</span>
            {product.mrp > product.price && (
              <span className="font-mono text-sm text-b-mist line-through">{money(product.mrp)}</span>
            )}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-b-mist">{product.description}</p>

          {product.specs.length > 0 && (
            <div className="mt-9 rounded-2xl border border-b-edge bg-b-slate/50 p-5">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-b-mist">Telemetry</h2>
              <ul className="mt-4 space-y-3">
                {product.specs.map((spec, i) => (
                  <li key={spec} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 font-mono text-[10px] text-b-mist/60">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 font-mono text-[12px] text-white/85">{spec}</span>
                    <span className="h-1 w-12 shrink-0 rounded-full bg-gradient-to-r from-b-rim to-b-signal opacity-60" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-b-key/25 bg-b-key/[0.06] p-6">
            <h2 className="text-base font-bold">Reserve at the counter</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-b-mist">
              Stock is held in the shop, not sold online. Call or WhatsApp and we will keep it aside today.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 rounded-xl bg-b-key px-5 py-3 text-sm font-bold text-b-obsidian transition hover:brightness-110 active:scale-[0.98]"
              >
                <Phone size={16} /> {settings.phone_primary}
              </a>
              <a
                href={whatsapp(settings, `Hi! Is the ${product.name} (${product.sku}) available?`)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-xl border border-b-edge px-5 py-3 text-sm font-semibold transition hover:bg-white/5 active:scale-[0.98]"
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
