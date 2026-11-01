import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Wrench, ShieldCheck, Truck, BadgeIndianRupee, Clock4, Smartphone,
  Search, PackageCheck, Star, MapPin, Sparkles, ChevronRight, Headphones, Watch, Tablet, Cable, Store,
  ChevronDown, Cpu, BatteryCharging,
} from 'lucide-react'
import { api, type Product, type Review } from '@/lib/api'
import { useSettings, fullAddress, mapEmbedUrl, mapDirectionsUrl } from '@/lib/useSettings'
import { useScenes } from '@/lib/useScenes'
import Reveal from '@/components/Reveal'
import Scene from '@/components/Scene'
import SectionTitle from '@/components/SectionTitle'
import ProductCard from '@/components/ProductCard'
import Counter from '@/components/Counter'
import Marquee from '@/components/Marquee'
import Magnetic from '@/components/Magnetic'
import SmartImage from '@/components/SmartImage'
import SectionNav, { type SectionDef } from '@/components/SectionNav'

const SECTIONS: SectionDef[] = [
  { id: 'home', label: 'Home' },
  { id: 'shop', label: 'Shop' },
  { id: 'picks', label: 'Top picks' },
  { id: 'repairs', label: 'Repairs' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'why', label: 'Why us' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'visit', label: 'Visit us' },
]

/* The three parts we actually open up, priced from the services list below.
   This is the scene the whole direction is built around. */
const TEARDOWN = [
  { key: 'display', icon: Smartphone, title: 'Screen replacement', time: '60–90 min', price: 'from ₹1,499', note: 'Original and service-pack displays, fitted with fresh waterproof adhesive.' },
  { key: 'battery', icon: BatteryCharging, title: 'Battery replacement', time: '30–45 min', price: 'from ₹899', note: 'Full-capacity cells with a health report before and after.' },
  { key: 'board', icon: Cpu, title: 'Motherboard repair', time: '2–4 days', price: 'on diagnosis', note: 'Chip-level work the authorised centres usually refuse.' },
]

const BRANDS = ['Samsung', 'Apple', 'OnePlus', 'Xiaomi', 'realme', 'vivo', 'OPPO', 'POCO', 'Nothing', 'Motorola', 'boAt', 'JBL']

const SERVICES = [
  { icon: Smartphone, title: 'Screen Replacement', time: '60–90 min', price: 'from ₹1,499', blurb: 'Original and service-pack displays, fitted with fresh waterproof adhesive.' },
  { icon: BadgeIndianRupee, title: 'Battery Replacement', time: '30–45 min', price: 'from ₹899', blurb: 'Full-capacity cells with a health report before and after.' },
  { icon: Cable, title: 'Charging Port Repair', time: '45–60 min', price: 'from ₹699', blurb: 'Micro-soldered flex replacement, verified at full fast-charge speed.' },
  { icon: ShieldCheck, title: 'Water Damage Rescue', time: '24–48 hrs', price: 'from ₹1,200', blurb: 'Ultrasonic board cleaning and corrosion treatment. No fix, no fee.' },
  { icon: Wrench, title: 'Motherboard Repair', time: '2–4 days', price: 'on diagnosis', blurb: 'Chip-level work the authorised centres usually refuse.' },
  { icon: PackageCheck, title: 'Data Recovery', time: '4–24 hrs', price: 'from ₹999', blurb: 'Photos and chats pulled off dead phones before any reflash.' },
]

const CATEGORIES = [
  { key: 'smartphone', label: 'Smartphones', icon: Smartphone, photo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80' },
  { key: 'audio', label: 'Audio', icon: Headphones, photo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
  { key: 'wearable', label: 'Smartwatches', icon: Watch, photo: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=600&q=80' },
  { key: 'tablet', label: 'Tablets', icon: Tablet, photo: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&w=600&q=80' },
  { key: 'accessory', label: 'Accessories', icon: Cable, photo: '/shop/shop-06.jpg' },
]

const TRACK_STEPS = [
  { icon: Wrench, title: 'Book it', text: 'Fill the repair form online or walk in. You get a ticket number straight away.' },
  { icon: Search, title: 'We diagnose', text: 'Our bench inspects the device and posts an honest estimate before touching anything.' },
  { icon: PackageCheck, title: 'Track it live', text: 'Enter your ticket and mobile number to see exactly where it stands.' },
]

/** One layer of the teardown. Stacked at rest, separated by the scrub. */
function Layer({ tag, className, children }: { tag: string; className: string; children?: React.ReactNode }) {
  return (
    <div
      data-layer={tag}
      className={`absolute inset-0 overflow-hidden rounded-[1.6rem] border lift-lg ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  )
}

export default function Home() {
  const settings = useSettings()
  const [featured, setFeatured] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<{ products: Product[] }>('/api/products?featured=true').then((d) => setFeatured(d.products.slice(0, 4))).catch(() => {})
    api.get<{ reviews: Review[] }>('/api/feedback').then((d) => setReviews(d.reviews.slice(0, 3))).catch(() => {})
  }, [])

  /*
   * Scroll scenes. Only ever built on a wide viewport with motion allowed —
   * everything below is readable and complete without a single tween, which
   * is the whole point of never hiding content behind a trigger.
   *
   * Re-runs when `featured` arrives because the catalogue row does not exist
   * on the first paint, and a trigger measured against a skeleton points at
   * the wrong offset once the real cards replace it.
   */
  useScenes(
    root,
    (gsap) => {
      gsap.to('[data-hero-device]', {
        rotateY: 24,
        rotateX: -7,
        scale: 0.84,
        yPercent: -5,
        ease: 'none',
        scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: 0.6 },
      })

      // The teardown: the scene is held still while the phone comes apart.
      // Pinning is the one thing Framer Motion does badly, and the only
      // reason GSAP earns its place in the bundle.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: '#repairs',
            start: 'top top',
            end: '+=1600',
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
          },
        })
        .to('[data-layer="display"]', { yPercent: -62, rotateX: 50, duration: 1 }, 0)
        .to('[data-layer="battery"]', { yPercent: -4, rotateX: 50, duration: 1 }, 0)
        .to('[data-layer="board"]', { yPercent: 54, rotateX: 50, duration: 1 }, 0)
        .to('[data-stack-hint]', { opacity: 0, duration: 0.2 }, 0)
        // Only the accent rail animates. The service text itself is never
        // hidden, so a trigger that fails leaves a readable price list.
        .fromTo(
          '[data-callout-rail]',
          { scaleY: 0 },
          { scaleY: 1, transformOrigin: 'top center', stagger: 0.18, duration: 0.5 },
          0.2,
        )

      // Everything else on the page reveals through <Reveal>, which also runs
      // on a phone. Only the rail is GSAP, because it has no Reveal wrapper.
      gsap.from('[data-rail-bar]', {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.45,
        stagger: 0.07,
        ease: 'power2.out',
        immediateRender: false,
        scrollTrigger: { trigger: '#tracking', start: 'top 70%' },
      })
    },
    [featured.length, reviews.length],
  )

  return (
    <div ref={root}>
      <SectionNav sections={SECTIONS} />

      {/* ------------------------------- hero ------------------------------ */}
      <Scene id="home">

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.08fr_1fr]">
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.35 }}>
              <span className="chip border border-brand-600/25 bg-brand-600/10 text-brand-700">
                <MapPin size={13} />
                Opp Galaxia Mall, Churi Centre Gali &middot; Ratu Road
              </span>
            </motion.div>

            <motion.h1
              className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.03] sm:text-5xl lg:text-6xl xl:text-7xl"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              Every phone you want. <span className="text-brand-600">Every repair you need.</span>
            </motion.h1>

            <motion.p
              className="mt-6 max-w-xl text-base leading-relaxed text-mist-400 lg:text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.19, duration: 0.38 }}
            >
              {settings.hero_sub ||
                'Latest smartphones, genuine accessories and same-day repairs — in Churi Centre Gali, just off Ratu Road, Ranchi.'}
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.36 }}
            >
              <Magnetic>
                <Link to="/book" className="btn-primary text-base">
                  <Wrench size={18} /> Book a Repair
                </Link>
              </Magnetic>
              <Magnetic>
                <Link to="/products" className="btn-ghost text-base">
                  Browse Phones <ArrowRight size={18} />
                </Link>
              </Magnetic>
            </motion.div>

            <motion.div
              className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-700 pt-6 sm:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.36, duration: 0.36 }}
            >
              {[
                { value: Number(settings.stats_customers) || 24000, suffix: '+', label: 'Happy customers' },
                { value: Number(settings.stats_repairs) || 38500, suffix: '+', label: 'Repairs completed' },
                { value: Number(settings.stats_years) || 21, suffix: ' yrs', label: 'Serving Ranchi' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-2xl font-bold text-mist-50 sm:text-3xl">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="mt-1 text-[11px] leading-tight text-mist-500 sm:text-xs">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            className="relative mx-auto hidden w-full max-w-sm lg:block lg:max-w-none [perspective:1400px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute -inset-10 rounded-full bg-key/14 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -inset-6 rounded-full bg-brand-600/14 blur-3xl" aria-hidden="true" />
            <div data-hero-device className="relative animate-float [transform-style:preserve-3d]">
              <div className="gradient-border overflow-hidden rounded-[2rem] lift-lg">
                <SmartImage
                  src="/shop/storefront-graded.jpg"
                  alt="The Vaishnavi Mobile Point storefront on Ratu Road, Ranchi"
                  seed="hero"
                  priority
                  className="aspect-[4/3] w-full"
                />
              </div>

              <motion.div
                className="glass-strong lift absolute -left-5 top-6 flex items-center gap-3 rounded-2xl p-3.5"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-key/15 text-key">
                  <Clock4 size={17} />
                </span>
                <div>
                  <div className="readout text-sm font-bold">90-minute</div>
                  <div className="text-[11px] text-mist-500">screen replacement</div>
                </div>
              </motion.div>

              <motion.div
                className="glass-strong lift absolute -right-5 bottom-6 flex items-center gap-3 rounded-2xl p-3.5"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/15 text-brand-700">
                  <Star size={17} fill="currentColor" />
                </span>
                <div>
                  <div className="readout text-sm font-bold">4.8 / 5 rating</div>
                  <div className="text-[11px] text-mist-500">from our customers</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* brand ticker lives inside the hero so it never costs a whole scene */}
        <motion.div
          className="relative mt-10 border-t border-ink-700 pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <Marquee
            items={BRANDS.map((brand) => (
              <span key={brand} className="font-display text-lg font-bold text-mist-500 sm:text-xl">
                {brand}
              </span>
            ))}
          />
        </motion.div>

        <motion.div
          className="relative mt-6 hidden justify-center md:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1] }}
          transition={{ delay: 0.7, duration: 0.8 }}
          aria-hidden="true"
        >
          <motion.span
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-2 text-xs font-medium text-mist-500"
          >
            Scroll to explore <ChevronDown size={15} />
          </motion.span>
        </motion.div>
      </Scene>

      {/* ----------------------------- categories --------------------------- */}
      <Scene id="shop">
        <SectionTitle
          eyebrow="What we stock"
          title={<>Shop by <span className="text-key">category</span></>}
          subtitle="Everything on these shelves is sealed, billed with GST and covered by the brand's own India warranty."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat.key} delay={Math.min(i * 0.04, 0.3)}>
              <Link
                to={`/products?category=${cat.key}`}
                className="card-sheen lift group relative block h-52 overflow-hidden rounded-3xl border border-ink-700 transition-colors hover:border-brand-600/55"
              >
                <SmartImage
                  src={cat.photo}
                  alt={cat.label}
                  seed={cat.key}
                  className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-110"
                />
                {/* Studio floor: the stage colour, not the type colour. On the
                    old light theme this ramped from mist-50, which is now
                    near-white and would have put white text on white. */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-mist-50">
                  <cat.icon size={20} className="mb-2 text-key" />
                  <div className="flex items-center justify-between">
                    <span className="truncate font-display text-lg font-bold">{cat.label}</span>
                    <ChevronRight size={18} className="text-mist-300 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Scene>

      {/* ---------------------------- featured ------------------------------ */}
      <Scene id="picks">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <SectionTitle
            align="left"
            eyebrow="Moving fast this week"
            title={<>Handpicked by <span className="text-key">our counter</span></>}
            subtitle="The models our customers in Ranchi keep coming back for."
          />
          <Reveal delay={0.08}>
            <Link to="/products" className="btn-ghost">
              View full catalogue <ArrowRight size={17} />
            </Link>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.length === 0
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-80 rounded-3xl" />)
            : featured.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
        </div>
      </Scene>

      {/* ------------------------------ teardown ---------------------------- */}
      <Scene id="repairs" pinned>
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1fr]">
          <div className="relative mx-auto h-[300px] w-[185px] [perspective:1200px] sm:h-[380px] sm:w-[235px]">
            <div className="pointer-events-none absolute -inset-12 rounded-full bg-key/10 blur-3xl" aria-hidden="true" />
            {/* Stacked at rest. The scrub pulls them apart on desktop; below
                768px they ship already separated, because nothing is pinned
                there and the gesture would do nothing. */}
            <div className="relative h-full w-full [transform-style:preserve-3d]">
              <Layer
                tag="display"
                className="max-md:-translate-y-[28%] max-md:scale-[0.76] border-brand-600/45 bg-gradient-to-b from-brand-600/25 to-ink-900"
              >
                {/* The top layer is a real device from the catalogue, so the
                    thing coming apart is something we actually sell. */}
                <SmartImage
                  src={featured[0]?.image_url || '/shop/shop-02.jpg'}
                  alt=""
                  seed="teardown"
                  className="h-full w-full opacity-70"
                />
              </Layer>
              <Layer
                tag="battery"
                className="max-md:scale-[0.76] border-key/40 bg-gradient-to-b from-key/18 to-ink-900"
              >
                <div className="flex h-full items-center justify-center">
                  <div className="h-3/5 w-3/5 rounded-lg border border-key/50 bg-key/10" />
                </div>
              </Layer>
              <Layer
                tag="board"
                className="max-md:translate-y-[28%] max-md:scale-[0.76] border-success/35 bg-gradient-to-b from-success/12 to-ink-900"
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
              data-stack-hint
              className="readout absolute -bottom-8 left-1/2 w-max -translate-x-1/2 text-[10px] uppercase tracking-[0.18em] text-mist-500"
            >
              <span className="md:hidden">Three repairable layers</span>
              <span className="hidden md:inline">Scroll to separate</span>
            </div>
          </div>

          <div>
            <SectionTitle
              align="left"
              eyebrow="In-house repair bench"
              title={<>What we actually <span className="text-key">open up</span></>}
              subtitle="Chip-level expertise, genuine spares and a written warranty slip with every job."
            />

            <div className="mt-7 space-y-3">
              {TEARDOWN.map((item) => (
                <div
                  key={item.key}
                  className="relative flex gap-4 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 lift p-4"
                >
                  <span
                    data-callout-rail
                    className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-key to-brand-600"
                    aria-hidden="true"
                  />
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-800 text-key">
                    <item.icon size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="text-sm font-bold">{item.title}</h3>
                      <span className="readout text-xs text-key">{item.price}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-mist-400">{item.note}</p>
                    <span className="readout mt-1.5 inline-block text-[10px] uppercase tracking-[0.14em] text-mist-500">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* The bench does more than three things; the rest stay on the
                page rather than disappearing behind the scene. */}
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-700 pt-4">
              {SERVICES.filter((s) => !['Screen Replacement', 'Battery Replacement', 'Motherboard Repair'].includes(s.title)).map(
                (s) => (
                  <li key={s.title} className="flex items-center gap-2 text-[12px] text-mist-400">
                    <s.icon size={13} className="text-brand-700" />
                    {s.title}
                    <span className="readout text-[11px] text-mist-500">{s.price}</span>
                  </li>
                ),
              )}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Magnetic>
                <Link to="/book" className="btn-primary">
                  <Wrench size={17} /> Book a Repair
                </Link>
              </Magnetic>
              <Link to="/services" className="btn-ghost">
                All services and charges <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </Scene>

      {/* --------------------------- how tracking works --------------------- */}
      <Scene id="tracking">
        <SectionTitle
          eyebrow="No more 'kal aana'"
          title={<>Know exactly where your <span className="text-key">phone is</span></>}
          subtitle="Every repair gets a ticket number. Check it from home instead of calling the shop five times a day."
        />

        <div className="relative mt-12 grid gap-8 md:grid-cols-3">
          <div
            data-rail-bar
            className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-key via-brand-600 to-transparent md:block"
            aria-hidden="true"
          />
          {TRACK_STEPS.map((step, i) => (
            <Reveal key={step.title} delay={Math.min(i * 0.05, 0.3)} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-brand-600/25 bg-ink-900 lift">
                  <step.icon size={26} className="text-brand-700" />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                <p className="max-w-xs text-sm leading-relaxed text-mist-400">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.16} className="mt-10 text-center">
          <Magnetic>
            <Link to="/track" className="btn-primary">
              <Search size={18} /> Track my repair
            </Link>
          </Magnetic>
        </Reveal>
      </Scene>

      {/* ------------------------------ why us ------------------------------ */}
      <Scene id="why">
        <div className="rounded-[2rem] border border-ink-700 bg-ink-900 lift-lg p-7 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionTitle
                align="left"
                eyebrow="Why Ranchi trusts us"
                title={<>Twenty years in the <span className="text-key">same gali</span></>}
                subtitle={settings.about_lead}
              />

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, title: 'Genuine parts only', text: 'Service-pack spares with bills you can verify.' },
                  { icon: BadgeIndianRupee, title: 'Price before work', text: 'A written estimate before a single screw turns.' },
                  { icon: Truck, title: 'Free pickup in Ranchi', text: 'Within 8 km of Ratu Road, on request.' },
                  { icon: Sparkles, title: 'Data stays yours', text: 'Nothing copied, nothing kept.' },
                ].map((item, i) => (
                  <Reveal key={item.title} delay={Math.min(i * 0.04, 0.3)}>
                    <div className="flex gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-800 text-key">
                        <item.icon size={18} />
                      </span>
                      <div>
                        <div className="mb-0.5 text-sm font-semibold">{item.title}</div>
                        <div className="text-[13px] leading-relaxed text-mist-400">{item.text}</div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal direction="left">
              <div className="grid grid-cols-2 gap-4">
                <SmartImage
                  src="/shop/shop-03.jpg"
                  alt="Staff at the Vaishnavi Mobile Point counter"
                  seed="why-1"
                  className="aspect-[3/4] rounded-2xl border border-ink-700 lift"
                />
                <div className="mt-8 grid gap-4">
                  <SmartImage
                    src="/shop/shop-06.jpg"
                    alt="Chargers and cables stocked at the shop"
                    seed="why-2"
                    className="aspect-square rounded-2xl border border-ink-700 lift"
                  />
                  <SmartImage
                    src="/shop/shop-09.jpg"
                    alt="Shelves of accessories inside the shop"
                    seed="why-3"
                    className="aspect-square rounded-2xl border border-ink-700 lift"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Scene>

      {/* --------------------------- testimonials --------------------------- */}
      <Scene id="reviews">
        <SectionTitle
          eyebrow="In their words"
          title={<>What our <span className="text-key">customers say</span></>}
          subtitle="Real reviews left on this website by people who walked into the shop."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {reviews.map((review, i) => (
            <Reveal key={review.id} delay={Math.min(i * 0.04, 0.3)}>
              <figure className="flex h-full min-w-0 flex-col rounded-2xl border border-ink-700 bg-ink-850 lift p-6 transition-colors hover:border-brand-600/40">
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      size={14}
                      className={s < review.rating ? 'text-warn' : 'text-ink-600'}
                      fill={s < review.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <blockquote className="mb-5 flex-1 break-words text-[13px] leading-relaxed text-mist-300">
                  <span className="mb-1.5 block font-display text-base font-semibold text-mist-50">{review.title}</span>
                  {review.message.length > 150 ? `${review.message.slice(0, 150)}…` : review.message}
                </blockquote>
                <figcaption className="flex items-center gap-3 border-t border-ink-700 pt-4">
                  <SmartImage src={review.avatar_url} alt="" seed={String(review.id)} className="h-10 w-10 shrink-0 rounded-full" />
                  <div>
                    <div className="text-sm font-semibold">{review.name}</div>
                    <div className="text-xs text-mist-500">{review.city}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.12} className="mt-9 text-center">
          <Link to="/feedback" className="btn-ghost">
            Read all reviews &amp; leave yours <ArrowRight size={17} />
          </Link>
        </Reveal>
      </Scene>

      {/* ----------------------------- visit us ----------------------------- */}
      <Scene id="visit">
        <div className="relative overflow-hidden rounded-[2rem] border border-ink-700 bg-ink-900 lift-lg">
          <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionTitle
                align="left"
                eyebrow="Come say hello"
                title={<>Find us in <span className="text-key">Churi Centre Gali</span></>}
                subtitle={fullAddress(settings)}
              />
              <div className="mt-7 flex flex-wrap gap-3">
                <Magnetic>
                  <a href={mapDirectionsUrl(settings)} target="_blank" rel="noreferrer noopener" className="btn-primary">
                    <MapPin size={18} /> Get directions
                  </a>
                </Magnetic>
                <Link to="/contact" className="btn-ghost">
                  Contact options <ArrowRight size={17} />
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-mist-400">
                <span className="flex items-center gap-2">
                  <Clock4 size={15} className="text-key" /> Mon&ndash;Sat {settings.hours_weekday}
                </span>
                <span className="flex items-center gap-2">
                  <Clock4 size={15} className="text-key" /> Sunday {settings.hours_sunday}
                </span>
              </div>

              <div className="mt-6 flex items-center gap-3.5 rounded-2xl border border-ink-700 bg-ink-800 p-3.5">
                <Store size={18} className="shrink-0 text-brand-700" />
                <p className="text-[13px] leading-relaxed text-mist-400">
                  Also listed as <strong className="text-mist-200">Vaishnavi Mobile Center</strong> or
                  {' '}<strong className="text-mist-200">Vaishnavi Dial Point</strong> — same shop, same gali.
                </p>
              </div>
            </div>

            <Reveal direction="left">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-ink-700 lift">
                  <SmartImage
                    src="/shop/shop-20.jpg"
                    alt="Vaishnavi Mobile Point signboard above the shop entrance"
                    seed="visit"
                    className="aspect-[16/9] w-full"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-ink-700 lift">
                  <iframe
                    title="Map showing Vaishnavi Mobile Point, Ratu Road, Ranchi"
                    src={mapEmbedUrl(settings)}
                    className="h-52 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Scene>
    </div>
  )
}
