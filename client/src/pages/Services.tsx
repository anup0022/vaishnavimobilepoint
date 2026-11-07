import { Link } from 'react-router-dom'
import {
  Smartphone, BatteryCharging, Cable, Droplets, Cpu, Camera, Volume2, HardDriveDownload,
  SignalHigh, Wrench, ShieldCheck, Clock4, ArrowRight, BadgeCheck,
} from 'lucide-react'
import Reveal from '@/components/Reveal'
import SectionTitle from '@/components/SectionTitle'
import Magnetic from '@/components/Magnetic'
import SmartImage from '@/components/SmartImage'
import { useSettings } from '@/lib/useSettings'

const SERVICES = [
  { icon: Smartphone, title: 'Screen Replacement', price: '₹1,499 – ₹14,999', time: '60–90 min', warranty: '6 months',
    detail: 'Original or service-pack displays for every brand we stock. We re-apply factory waterproof adhesive and test touch across the full panel before handing it back.' },
  { icon: BatteryCharging, title: 'Battery Replacement', price: '₹899 – ₹4,499', time: '30–45 min', warranty: '6 months',
    detail: 'Full-capacity cells only. We print a battery health report before and after so you can see the difference, and dispose of the old cell safely.' },
  { icon: Cable, title: 'Charging Port Repair', price: '₹699 – ₹2,499', time: '45–60 min', warranty: '3 months',
    detail: 'Micro-soldered connector or flex replacement, then verified at the phone’s rated fast-charge speed rather than just "it charges".' },
  { icon: Droplets, title: 'Water Damage Rescue', price: '₹1,200 onwards', time: '24–48 hrs', warranty: '1 month',
    detail: 'Ultrasonic board cleaning, corrosion treatment and component-level testing. If we cannot revive it, you pay nothing for the attempt.' },
  { icon: Cpu, title: 'Motherboard / Chip-level', price: 'On diagnosis', time: '2–4 days', warranty: '3 months',
    detail: 'Reballing, IC replacement and track repair under a microscope — the work most authorised centres will not attempt on an out-of-warranty device.' },
  { icon: Camera, title: 'Camera Module Repair', price: '₹999 – ₹6,999', time: '60 min', warranty: '3 months',
    detail: 'Blurry, shaking or black camera fixed by replacing the module and re-calibrating OIS where the phone supports it.' },
  { icon: Volume2, title: 'Speaker & Mic Repair', price: '₹599 – ₹1,999', time: '45 min', warranty: '3 months',
    detail: 'Muffled calls, dead earpiece or a mic nobody can hear — usually a mesh clean or a cheap module, never a new phone.' },
  { icon: HardDriveDownload, title: 'Software & Data Recovery', price: '₹999 – ₹3,499', time: '4–24 hrs', warranty: '—',
    detail: 'Bootloops, failed updates and forgotten patterns. We always attempt a data pull before any reflash, and nothing is copied or kept.' },
  { icon: SignalHigh, title: 'Network / IMEI Issues', price: '₹1,499 onwards', time: '1–2 days', warranty: '3 months',
    detail: 'No-signal and SIM-not-detected faults traced to the antenna, SIM reader or power amplifier, with legal repairs only.' },
]

const PROMISES = [
  { icon: ShieldCheck, title: 'Written warranty slip', text: 'Every repair leaves with a printed warranty on the part and the labour.' },
  { icon: BadgeCheck, title: 'Estimate before work', text: 'We call you with a price after diagnosis. Nothing starts until you say yes.' },
  { icon: Clock4, title: 'No fix, no fee', text: 'If we cannot solve it, you pay nothing but the diagnosis charge — often waived.' },
]

export default function Services() {
  const settings = useSettings()

  return (
    <div className="relative px-4 pb-24 pt-16 sm:px-6">

      <div className="relative mx-auto max-w-7xl">
        <Reveal className="text-center">
          <span className="chip border border-brand-700/30 bg-brand-600/10 text-brand-700">
            <Wrench size={13} /> Repair centre
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold sm:text-6xl">
            Services &amp; <span className="text-brand-600">charges</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-mist-400">
            Published prices, published timelines. The range depends on your model — we confirm the exact figure after
            diagnosis, before any work begins.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <Reveal key={service.title} delay={Math.min(i * 0.04, 0.3)}>
              <article className="group flex h-full flex-col rounded-3xl border border-ink-700 bg-ink-850 lift p-7 transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.985] hover:border-brand-600/45">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <service.icon size={24} />
                </div>
                <h2 className="mb-3 text-xl font-bold">{service.title}</h2>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-mist-400">{service.detail}</p>
                <dl className="grid grid-cols-3 gap-3 border-t border-ink-700 pt-5 text-xs">
                  <div>
                    <dt className="mb-1 text-mist-500">Price</dt>
                    <dd className="font-semibold text-brand-600">{service.price}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-mist-500">Time</dt>
                    <dd className="font-semibold text-mist-200">{service.time}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-mist-500">Warranty</dt>
                    <dd className="font-semibold text-mist-200">{service.warranty}</dd>
                  </div>
                </dl>
              </article>
            </Reveal>
          ))}
        </div>

        {/* promises */}
        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {PROMISES.map((promise, i) => (
            <Reveal key={promise.title} delay={Math.min(i * 0.04, 0.3)}>
              <div className="flex gap-4 rounded-3xl border border-ink-700 bg-ink-900 lift p-7">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600/15 text-brand-600">
                  <promise.icon size={22} />
                </span>
                <div>
                  <h3 className="mb-1.5 font-bold">{promise.title}</h3>
                  <p className="text-sm leading-relaxed text-mist-400">{promise.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <div className="relative mt-24 overflow-hidden rounded-[2.5rem] border border-ink-700">
          <SmartImage
            src="/shop/shop-15.jpg"
            alt="Inside Vaishnavi Mobile Point, Churi Centre Gali"
            seed="services-cta"
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/92 to-ink-950/70" />
          <div className="relative grid gap-8 p-8 sm:p-14 lg:grid-cols-2 lg:items-center">
            <SectionTitle
              align="left"
              eyebrow="Ready when you are"
              title={<>Book it now, <span className="text-brand-600">track it later</span></>}
              subtitle={`Drop in at ${settings.address_line2 || 'our counter'} or book online and we will keep a slot on the bench for you.`}
            />
            <Reveal delay={0.15} className="flex flex-wrap gap-4 lg:justify-end">
              <Magnetic>
                <Link to="/book" className="btn-primary">
                  <Wrench size={18} /> Book a repair
                </Link>
              </Magnetic>
              <Link to="/track" className="btn-ghost">
                Track existing repair <ArrowRight size={17} />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  )
}
