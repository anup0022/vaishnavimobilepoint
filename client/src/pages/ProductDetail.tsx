import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Phone, ShieldCheck, Truck, RefreshCw, Star, Sparkles,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { api, ApiError, type Product } from '@/lib/api'
import { money, AVAILABILITY_LABELS, CATEGORY_LABELS } from '@/lib/format'
import { galleryFor } from '@/lib/gallery'
import { responsive } from '@/lib/images'
import { useSettings, whatsappLink } from '@/lib/useSettings'
import { applyNotFoundMeta, applyProductMeta } from '@/lib/pageMeta'
import { trackPageView } from '@/lib/analytics'
import SmartImage from '@/components/SmartImage'
import ProductPhoto, { categoryIcon } from '@/components/ProductPhoto'
import ProductCard from '@/components/ProductCard'
import Reveal from '@/components/Reveal'
import Magnetic from '@/components/Magnetic'
import { WhatsApp } from '@/components/BrandIcons'

const AVAILABILITY_STYLE: Record<string, string> = {
  in_stock: 'border-success/35 bg-success/10 text-success',
  low_stock: 'border-warn/35 bg-warn/10 text-warn',
  out_of_stock: 'border-danger/35 bg-danger/10 text-danger',
}

export default function ProductDetail() {
  const { slug } = useParams()
  const settings = useSettings()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setLoading(true)
    setMissing(false)
    setError('')
    api
      .get<{ product: Product; related: Product[] }>(`/api/products/${slug}`)
      .then((d) => {
        setProduct(d.product)
        setRelated(d.related)
        applyProductMeta(d.product)
        trackPageView()
      })
      .catch((e: ApiError) => {
        // Only a 404 means the product is gone. A dropped connection, a
        // timeout or a blocked request used to land here too and turn a real
        // product page into "Item not found", with the not-found title.
        if (e.status === 404) {
          setMissing(true)
          applyNotFoundMeta()
        } else {
          // The raw text ("Failed to fetch", a server message) means nothing
          // to a shopper, so the page says it in plain words instead.
          setError(e.message || 'failed')
        }
        trackPageView()
      })
      .finally(() => setLoading(false))
  }, [slug, attempt])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="shimmer aspect-square rounded-3xl" />
          <div className="space-y-5">
            <div className="shimmer h-5 w-28 rounded-full" />
            <div className="shimmer h-14 w-full rounded-2xl" />
            <div className="shimmer h-24 w-full rounded-2xl" />
            <div className="shimmer h-12 w-48 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
        <h1 className="mb-4 font-display text-4xl font-bold">We could not load this item</h1>
        <p className="mb-8 text-mist-400">
          The connection dropped or the server is busy. Please try again, or call {settings.phone_primary} and we
          will tell you about it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => setAttempt((n) => n + 1)} className="btn-primary">
            <RefreshCw size={18} /> Try again
          </button>
          <Link to="/products" className="btn-ghost">
            <ArrowLeft size={18} /> Back to the catalogue
          </Link>
        </div>
      </div>
    )
  }

  if (missing || !product) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
        <h1 className="mb-4 font-display text-4xl font-bold">Item not found</h1>
        <p className="mb-8 text-mist-400">That product is no longer in our catalogue.</p>
        <Link to="/products" className="btn-primary">
          <ArrowLeft size={18} /> Back to the catalogue
        </Link>
      </div>
    )
  }

  const enquiry = `Hi! I'm interested in the ${product.name} (${product.sku}) listed on your website. Is it available?`

  return (
    <div className="relative px-4 pb-24 pt-10 sm:px-6">

      <div className="relative mx-auto max-w-7xl">
        {/* The trail the page's BreadcrumbList markup describes (server/seo.js). */}
        <nav aria-label="Breadcrumb" className="mb-10 text-sm font-medium text-mist-400">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="transition hover:text-brand-700">Home</Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link to="/products" className="inline-flex items-center gap-1.5 transition hover:text-brand-700">
                <ArrowLeft size={14} /> Shop
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-mist-300">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <OrbitGallery product={product} />

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, label: 'Brand warranty' },
                { icon: Truck, label: 'Same-day pickup' },
                { icon: RefreshCw, label: 'Exchange accepted' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-ink-700 bg-ink-850 lift p-4 text-center"
                >
                  <item.icon size={18} className="text-key" />
                  <span className="text-[11px] leading-tight text-mist-400">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <span className="chip border border-ink-600 bg-ink-800 text-mist-300">{product.brand}</span>
                <span className="chip border border-ink-600 bg-ink-800 text-mist-300">
                  {CATEGORY_LABELS[product.category] || product.category}
                </span>
                <span className={`chip border ${AVAILABILITY_STYLE[product.availability]}`}>
                  {AVAILABILITY_LABELS[product.availability]}
                </span>
                {product.featured && (
                  <span className="chip border border-brand-600/30 bg-ink-900 text-brand-600">
                    <Star size={12} fill="currentColor" /> Popular pick
                  </span>
                )}
              </div>

              <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-5xl">{product.name}</h1>
              <p className="readout mt-2 text-sm text-mist-500">Item code {product.sku}</p>

              <div className="mt-7 flex flex-wrap items-end gap-4">
                <span className="readout text-5xl font-bold text-key">{money(product.price)}</span>
                {product.mrp > product.price && (
                  <>
                    <span className="readout text-xl text-mist-500 line-through">{money(product.mrp)}</span>
                    <span className="chip border border-success/35 bg-success/10 text-success">
                      You save {money(product.mrp - product.price)}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs text-mist-500">Inclusive of all taxes. GST invoice provided.</p>

              <p className="mt-8 text-lg leading-relaxed text-mist-200">{product.description}</p>
            </Reveal>

            {product.specs?.length > 0 && (
              <Reveal delay={0.1}>
                <div className="mt-10 rounded-3xl border border-ink-700 bg-ink-850 lift p-7">
                  <h2 className="readout mb-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-mist-500">
                    <Sparkles size={14} className="text-key" /> Specifications
                  </h2>
                  <ul className="space-y-3">
                    {product.specs.map((spec, i) => (
                      <li key={spec} className="flex items-center gap-3">
                        {/* Decorative numbering: read aloud or extracted as text it
                            fused with the spec, e.g. "0212MP dual camera". */}
                        <span className="readout w-6 shrink-0 text-[10px] text-mist-500" aria-hidden="true">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="readout flex-1 text-[13px] text-mist-200">{spec}</span>
                        <span
                          className="h-1 w-12 shrink-0 rounded-full bg-gradient-to-r from-brand-600 to-success opacity-60"
                          aria-hidden="true"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}

            <Reveal delay={0.16}>
              <div className="mt-10 rounded-3xl border border-key/25 bg-key/[0.06] p-7">
                <h2 className="mb-2 text-lg font-bold">Reserve it over the phone</h2>
                <p className="mb-6 text-sm leading-relaxed text-mist-300">
                  We hold stock at the counter rather than selling online. Call or WhatsApp us and we will keep this
                  aside for you today — bring a photo ID when you collect.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Magnetic>
                    <a href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`} className="btn-primary">
                      <Phone size={18} /> Call {settings.phone_primary}
                    </a>
                  </Magnetic>
                  <a
                    href={whatsappLink(settings, enquiry)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-ghost"
                  >
                    <WhatsApp size={18} /> WhatsApp enquiry
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-28">
            <h2 className="mb-10 font-display text-3xl font-bold">
              Also in <span className="text-key">{CATEGORY_LABELS[product.category] || product.category}</span>
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item, i) => (
                <ProductCard key={item.id} product={item} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Orbit gallery
 *
 * Drag horizontally to turn the device, or use the arrows and the
 * keyboard. The frames are placeholder re-crops of the product's own
 * photograph plus a real shot of the counter — the database holds one
 * image per product, and the caption says so rather than pretending.
 * ------------------------------------------------------------------ */

function OrbitGallery({ product }: { product: Product }) {
  const frames = galleryFor(product)
  const [index, setIndex] = useState(0)
  const drag = useRef<{ x: number; from: number } | null>(null)

  // A new product must not inherit the previous one's frame position.
  useEffect(() => setIndex(0), [product.sku])

  const go = (step: number) => setIndex((i) => (((i + step) % frames.length) + frames.length) % frames.length)

  function onPointerDown(event: React.PointerEvent) {
    // Capturing the pointer here would redirect the following pointerup to this
    // element, so a tap that started on the prev/next button never became a
    // click and the arrows did nothing.
    if ((event.target as HTMLElement).closest('button')) return
    drag.current = { x: event.clientX, from: index }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag.current) return
    // 70px of travel per frame: far enough that a vertical scroll that
    // wanders sideways does not spin the device.
    const steps = Math.round((event.clientX - drag.current.x) / 70)
    const next = (((drag.current.from - steps) % frames.length) + frames.length) % frames.length
    if (next !== index) setIndex(next)
  }

  const frame = frames[index]
  const big = frame.placeholder ? null : responsive(frame.src, 1, [480, 720, 960, 1200, 1600])
  const Icon = categoryIcon(product.category)

  return (
    <div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1)
          if (e.key === 'ArrowLeft') go(-1)
        }}
        tabIndex={0}
        role="group"
        aria-label={`${product.name} — frame ${index + 1} of ${frames.length}`}
        className="gradient-border relative cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-[2rem]"
      >
        <div className="pointer-events-none absolute -left-16 top-0 h-full w-1/2 bg-key/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-full w-1/2 bg-brand-600/12 blur-3xl" aria-hidden="true" />

        <AnimatePresence mode="wait">
          <motion.div
            key={frame.src}
            initial={{ opacity: 0, rotateY: 12 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -12 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {big ? (
              <SmartImage
                src={big.src}
                srcSet={big.srcSet}
                sizes="(max-width: 1023px) calc(100vw - 40px), 600px"
                alt={`${product.name} — ${frame.label}`}
                seed={product.sku}
                // The first frame is the page's largest image: fetch it first
                // instead of lazily, once the product data has arrived.
                priority={index === 0}
                className="aspect-square w-full"
              />
            ) : (
              <ProductPhoto product={product} sizes="(max-width: 1023px) calc(100vw - 40px), 600px" className="aspect-square w-full" />
            )}
          </motion.div>
        </AnimatePresence>

        {product.discount > 0 && (
          <span className="readout absolute left-5 top-5 rounded-lg bg-key px-3 py-1.5 text-sm font-bold text-key-ink">
            Save {product.discount}%
          </span>
        )}

        {frames.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
            <button
              onClick={() => go(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/70 text-mist-200 transition hover:bg-ink-950"
              aria-label="Previous frame"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="readout rounded-full bg-ink-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-mist-300">
              drag to orbit · {index + 1}/{frames.length}
            </span>
            <button
              onClick={() => go(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/70 text-mist-200 transition hover:bg-ink-950"
              aria-label="Next frame"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {frames.map((f, i) => {
            const thumb = f.placeholder ? null : responsive(f.src, 1, [120, 180])
            return (
            <button
              key={f.src || f.label}
              onClick={() => setIndex(i)}
              aria-label={f.label}
              aria-current={i === index}
              className={`h-14 w-14 overflow-hidden rounded-xl border transition ${
                i === index ? 'border-key' : 'border-ink-700 opacity-55 hover:opacity-90'
              }`}
            >
              {thumb ? (
                <SmartImage src={thumb.src} srcSet={thumb.srcSet} sizes="56px" alt="" seed={f.label} className="h-full w-full" />
              ) : (
                <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.25} className="opacity-50" />
                </span>
              )}
            </button>
            )
          })}
        </div>
        <p className="readout text-right text-[10px] uppercase tracking-[0.14em] text-mist-500">
          {frame.label}
          {frame.placeholder && (
            <span className="block normal-case tracking-normal">ask us on WhatsApp for a real photo</span>
          )}
        </p>
      </div>
    </div>
  )
}
