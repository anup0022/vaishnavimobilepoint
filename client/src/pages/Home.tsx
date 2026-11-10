import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Wrench, ShieldCheck, BadgeIndianRupee, Clock4, Smartphone,
  PackageCheck, MapPin, ChevronRight, Headphones, Watch, Tablet, Cable, Store,
  Cpu, BatteryCharging,
} from 'lucide-react'
import { api, type Product, type Review } from '@/lib/api'
import { useSettings, fullAddress, mapEmbedUrl, mapDirectionsUrl } from '@/lib/useSettings'
import { useScenes } from '@/lib/useScenes'
import Reveal from '@/components/Reveal'
import Scene from '@/components/Scene'
import SectionTitle from '@/components/SectionTitle'
import ProductCard from '@/components/ProductCard'
import Magnetic from '@/components/Magnetic'
import SmartImage from '@/components/SmartImage'
import HomeHero from '@/components/HomeHero'
import HomeTrust from '@/components/HomeTrust'
import SectionNav, { type SectionDef } from '@/components/SectionNav'
import './Home.css'

const SECTIONS: SectionDef[] = [
  { id: 'home', label: 'Home' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'shop', label: 'Shop' },
  { id: 'picks', label: 'Top picks' },
  { id: 'repairs', label: 'Repairs' },
  { id: 'why', label: 'Why us' },
  { id: 'visit', label: 'Visit us' },
]

/* The four jobs the bench is known for, dealt out as a deck over the
   pinned scene. Four because the fan is cut for four — past that the
   cards stop reading as separate cards and start reading as a smear. */
const BENCH = [
  { icon: Smartphone, title: 'Screen replacement', time: '60–90 min', price: 'from ₹1,499', note: 'Original and service-pack displays, fitted with fresh waterproof adhesive.', tone: 'tilt-tone-brand' },
  { icon: BatteryCharging, title: 'Battery replacement', time: '30–45 min', price: 'from ₹899', note: 'Full-capacity cells with a health report before and after.', tone: 'tilt-tone-key' },
  { icon: Cpu, title: 'Motherboard repair', time: '2–4 days', price: 'on diagnosis', note: 'Chip-level work the authorised centres usually refuse.', tone: 'tilt-tone-deep' },
  { icon: ShieldCheck, title: 'Water damage rescue', time: '24–48 hrs', price: 'from ₹1,200', note: 'Ultrasonic board cleaning and corrosion treatment. No fix, no fee.', tone: 'tilt-tone-mint' },
]

/** Degrees the deck fans across. Each card repeats its circle's rotation,
    so the tilt you actually see is twice the step — and the step is also
    what decides how much of the card underneath stays readable. */
const TILT_FAN = 16

const benchRotation = (index: number) => -TILT_FAN / 2 + (TILT_FAN / (BENCH.length - 1)) * index

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

/** Everything the bench does that the deck has no room for. */
const BENCH_REST = SERVICES.filter(
  (service) => !BENCH.some((card) => card.title.toLowerCase() === service.title.toLowerCase()),
)

export default function Home() {
  const settings = useSettings()
  const [featured, setFeatured] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<{ products: Product[] }>('/api/products?featured=true').then((d) => setFeatured(d.products.slice(0, 4))).catch(() => {})
    api.get<{ reviews: Review[] }>('/api/feedback').then((d) => setReviews(d.reviews.slice(0, 6))).catch(() => {})
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
      // The repair deck. Pinning is the one thing Framer Motion does
      // badly, and the only reason GSAP earns its place in the bundle.
      const runway = root.current?.querySelector<HTMLElement>('[data-tilt-runway]')
      const orbits = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-tilt-orbit]') ?? [])

      if (runway && orbits.length) {
        const travel = runway.clientHeight - window.innerHeight
        const perCard = travel / orbits.length
        // One trigger object per tween: ScrollTrigger takes ownership of
        // the config it is handed, so the two cannot share one.
        const dealt = (index: number) => ({
          trigger: runway,
          start: `top top-=${perCard * index}`,
          end: `+=${perCard}`,
          scrub: true,
        })

        // Drifts down to nothing rather than through zero, so the dealt deck
        // comes to rest centred on the stage at any viewport height. Plain
        // `y`, not `yPercent`: a percentage gets resolved into `y` the first
        // time the scene is rebuilt, and then survives as a fixed offset.
        gsap.fromTo(
          '[data-tilt-deck]',
          { y: '7vh' },
          {
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: runway,
              start: 'top top',
              end: 'bottom bottom',
              pin: '[data-tilt-stage]',
              pinSpacing: true,
              anticipatePin: 1,
              scrub: true,
            },
          },
        )

        // The heading hands the scene over to the deck rather than
        // sitting behind it — by the second card it is fully covered.
        gsap.to('[data-tilt-headline]', {
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: runway, start: 'top top', end: `+=${travel * 0.28}`, scrub: true },
        })

        orbits.forEach((orbit, index) => {
          const rotation = benchRotation(index)
          // Flat and below the fold, swinging up into the resting fan the
          // stylesheet already describes. yPercent has to be named on both
          // ends: the resting transform carries a -50% that would
          // otherwise survive the tween and park the card half in frame.
          gsap.fromTo(orbit, { rotation: 0 }, { rotation, ease: 'power1.out', scrollTrigger: dealt(index) })
          gsap.fromTo(
            orbit.firstElementChild,
            { rotation: 0, y: '55vh', yPercent: 0 },
            { rotation, y: 0, yPercent: -50, ease: 'power1.out', scrollTrigger: dealt(index) },
          )
        })
      }
    },
    [featured.length, reviews.length],
  )

  return (
    <div ref={root} className="vmp-light">
      <SectionNav sections={SECTIONS} />

      {/* ------------------------------- hero ------------------------------ */}
      <HomeHero />

      {/* ---------------------------- testimonials -------------------------- */}
      <HomeTrust reviews={reviews} />

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
                className="card-sheen lift group relative block h-52 overflow-hidden rounded-3xl border border-ink-700 transition-colors hover:border-brand-600/45"
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

      {/* ---------------------------- repair bench -------------------------- */}
      <section id="repairs" className="tilt-cards">
        <div
          className="tilt-cards_runway"
          data-tilt-runway
          style={{ '--tilt-count': BENCH.length } as CSSProperties}
        >
          <div className="tilt-cards_headline">
            <div className="tilt-cards_headline-inner">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6" data-tilt-headline>
                <SectionTitle
                  eyebrow="In-house repair bench"
                  title={<>What we actually <span className="text-key">open up</span></>}
                  subtitle="Chip-level expertise, genuine spares and a written warranty slip with every job."
                />
                <p className="tilt-cards_hint readout mt-8 text-center text-[10px] uppercase tracking-[0.18em] text-mist-500">
                  Scroll to deal the bench out
                </p>
              </div>
            </div>
          </div>

          <div className="tilt-cards_stage" data-tilt-stage>
            <div className="tilt-cards_deck" data-tilt-deck>
              {BENCH.map((item, i) => (
                <div
                  key={item.title}
                  className="tilt-cards_orbit"
                  data-tilt-orbit
                  style={{ '--tilt-rot': `${benchRotation(i)}deg` } as CSSProperties}
                >
                  <article className={`tilt-card lift-lg ${item.tone}`}>
                    <span className="tilt-card_icon">
                      <item.icon size={25} strokeWidth={1.6} />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold leading-tight">{item.title}</h3>
                      <p className="mt-3 text-[0.82rem] leading-relaxed">{item.note}</p>
                      <div className="tilt-card_meta">
                        <span>{item.price}</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The bench does more than four things, and the deck is scenery
            rather than a control — so the rest of the list and both ways
            out of the section stay in normal flow underneath it. */}
        <div className="tilt-cards_tail mx-auto w-full max-w-7xl px-4 sm:px-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-ink-700 pt-6">
            {BENCH_REST.map((service) => (
              <li key={service.title} className="flex items-center gap-2 text-[12px] text-mist-400">
                <service.icon size={13} className="text-brand-700" />
                {service.title}
                <span className="readout text-[11px] text-mist-500">{service.price}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
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
      </section>

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
