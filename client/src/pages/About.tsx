import { Link } from 'react-router-dom'
import { Store, Heart, Users, Award, ArrowRight, Quote, Wrench } from 'lucide-react'
import Reveal from '@/components/Reveal'
import SectionTitle from '@/components/SectionTitle'
import SmartImage from '@/components/SmartImage'
import { shopPhoto } from '@/lib/images'
import Counter from '@/components/Counter'
import Magnetic from '@/components/Magnetic'
import { useSettings } from '@/lib/useSettings'
// Shared with the server, which writes the story into the HTML it sends.
import ABOUT from '@/data/about.json'

const TIMELINE = ABOUT.timeline
const VALUE_ICONS: Record<string, typeof Heart> = { Heart, Award, Users, Store }
const VALUES = ABOUT.values.map((value) => ({ ...value, icon: VALUE_ICONS[value.icon] ?? Heart }))

export default function About() {
  const settings = useSettings()
  // Counted from the founding year, so the page never says "Fourteen years"
  // under a timeline that starts in 2005.
  const founded = Number.parseInt(String(settings.established ?? ''), 10)
  const years =
    Number.isFinite(founded) && founded > 1900 ? new Date().getFullYear() - founded : Number(settings.stats_years) || 0

  return (
    <div className="relative px-4 pb-24 pt-16 sm:px-6">

      <div className="relative mx-auto max-w-7xl">
        <Reveal className="text-center">
          <span className="chip border border-brand-700/30 bg-brand-600/10 text-brand-700">
            <Store size={13} /> Our story
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold sm:text-6xl">
            Keeping Ranchi <span className="text-brand-600">connected</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-mist-400">{settings.about_lead}</p>
        </Reveal>

        {/* stats */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: Number(settings.stats_customers) || 24000, suffix: '+', label: 'Customers served' },
            { value: Number(settings.stats_repairs) || 38500, suffix: '+', label: 'Devices repaired' },
            { value: Number(settings.stats_brands) || 12, suffix: '', label: 'Brands stocked' },
            { value: years, suffix: '', label: 'Years in Ranchi' },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={Math.min(i * 0.04, 0.3)}>
              <div className="rounded-3xl border border-ink-700 bg-ink-850 lift p-8 text-center">
                <div className="font-display text-4xl font-extrabold text-brand-600">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="mt-2 text-sm text-mist-400">{stat.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* story + photos */}
        <div className="mt-24 grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionTitle
              align="left"
              eyebrow="Who we are"
              title={<>A shop built on <span className="text-brand-600">repeat customers</span></>}
            />
            <p className="mt-7 text-lg leading-relaxed text-mist-300">{settings.about_body}</p>
            <p className="mt-5 leading-relaxed text-mist-400">
              Most of our business still comes from somebody telling a cousin or a colleague where to go. That only
              works if every single person who walks out is treated the way we would want our own family treated — so
              that is the whole strategy.
            </p>

            <div className="mt-10 rounded-2xl border-l-2 border-brand-700 bg-brand-600/8 p-6">
              <Quote size={22} className="mb-3 text-brand-700" />
              <p className="text-[15px] italic leading-relaxed text-mist-200">
                We would rather lose a sale than sell someone a phone they do not need. They always come back for the
                next one.
              </p>
              <p className="mt-4 text-sm font-semibold text-mist-400">— The team at Vaishnavi</p>
            </div>
          </Reveal>

          <Reveal direction="left">
            <div className="grid grid-cols-2 gap-4">
              <SmartImage
                {...shopPhoto('/shop/shop-10.jpg')}
                sizes="(max-width: 1023px) 110vw, 720px"
                alt="The Vaishnavi Mobile Point storefront in Churi Centre Gali"
                seed="about-1"
                className="aspect-[3/4] rounded-3xl border border-ink-700"
              />
              <div className="mt-10 grid gap-4">
                <SmartImage
                  {...shopPhoto('/shop/shop-03.jpg')}
                  sizes="(max-width: 1023px) 60vw, 400px"
                  alt="Staff at the Vaishnavi Mobile Point counter"
                  seed="about-2"
                  className="aspect-square rounded-3xl border border-ink-700"
                />
                <SmartImage
                  {...shopPhoto('/shop/shop-08.jpg')}
                  sizes="(max-width: 1023px) 60vw, 400px"
                  alt="Accessory shelves inside the shop"
                  seed="about-3"
                  className="aspect-square rounded-3xl border border-ink-700"
                />
              </div>
            </div>
          </Reveal>
        </div>

        {/* timeline */}
        <div className="mt-28">
          <SectionTitle
            eyebrow="How we got here"
            title={<>{years} years, <span className="text-brand-600">one street</span></>}
          />

          <div className="relative mt-16">
            <div
              className="absolute left-[19px] top-2 h-[calc(100%-1rem)] w-px bg-ink-600 md:left-1/2"
              aria-hidden="true"
            />
            <div className="space-y-10">
              {TIMELINE.map((item, i) => (
                <Reveal key={item.year} delay={Math.min(i * 0.04, 0.3)} direction={i % 2 ? 'left' : 'right'}>
                  <div
                    className={`relative flex gap-6 md:w-1/2 ${ i % 2 ? 'md:ml-auto md:pl-12' : 'md:flex-row-reverse md:pr-12 md:text-right' }`}
                  >
                    <span
                      className={`absolute left-0 top-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink-950 bg-brand-600 text-[11px] font-bold text-white md:left-auto ${ i % 2 ? 'md:-left-5' : 'md:-right-5' }`}
                    >
                      {item.year === 'Today' ? '★' : item.year.slice(2)}
                    </span>
                    <div className="ml-16 flex-1 rounded-3xl border border-ink-700 bg-ink-850 lift p-7 md:ml-0">
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600">{item.year}</div>
                      <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-mist-400">{item.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* values */}
        <div className="mt-28">
          <SectionTitle eyebrow="What we hold to" title={<>Four rules we <span className="text-brand-600">do not bend</span></>} />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, i) => (
              <Reveal key={value.title} delay={Math.min(i * 0.04, 0.3)}>
                <div className="h-full rounded-3xl border border-ink-700 bg-ink-850 lift p-7 transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.985] hover:border-brand-600/45">
                  <span className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-600/20 p-3.5 text-brand-700">
                    <value.icon size={22} />
                  </span>
                  <h3 className="mb-2 text-lg font-bold">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-mist-400">{value.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Reveal delay={0.15}>
          <div className="relative mt-24 overflow-hidden rounded-[2.5rem] border border-ink-700 p-10 text-center sm:p-16">
            <div className="relative">
              <h2 className="font-display text-4xl font-bold sm:text-5xl">
                Come see us <span className="text-brand-600">in person</span>
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg text-mist-400">
                Opposite Galaxia Mall, Churi Centre Gali, Ratu Road. Open seven days a week.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Magnetic>
                  <Link to="/book" className="btn-primary">
                    <Wrench size={18} /> Book a repair
                  </Link>
                </Magnetic>
                <Link to="/contact" className="btn-ghost">
                  Contact &amp; directions <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
