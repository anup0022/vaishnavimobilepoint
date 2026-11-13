import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { Facebook, InstagramLogo, WhatsAppLogo, Youtube } from './BrandIcons'
import { useSettings, fullAddress, googleReviewUrl, isRealProfile, mapDirectionsUrl, whatsappLink } from '@/lib/useSettings'
import Wordmark from './store/Wordmark'
import './store/store.css'

const SHOP_LINKS = [
  { to: '/products?category=smartphone', label: 'Smartphones' },
  { to: '/products?category=audio', label: 'Earbuds & Headphones' },
  { to: '/products?category=wearable', label: 'Smartwatches' },
  { to: '/products?category=tablet', label: 'Tablets' },
  { to: '/products?category=accessory', label: 'Accessories' },
  { to: '/products', label: 'All products' },
]

const REPAIR_LINKS = [
  { to: '/services', label: 'Repair prices' },
  { to: '/book', label: 'Book a repair' },
  { to: '/track', label: 'Track your repair' },
  { to: '/feedback', label: 'Customer reviews' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About us' },
]

/** How the FAQ says customers can pay. */
const PAYMENTS = ['UPI', 'Cards', 'Cash', 'No-cost EMI']

const linkClass = 'text-[15px] font-medium leading-[27px] text-[var(--st-muted)] transition-colors hover:text-black'

export default function Footer() {
  const settings = useSettings()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState('')
  const year = new Date().getFullYear()

  const socials = [
    { url: settings.social_instagram, label: 'Instagram', icon: <InstagramLogo size={34} /> },
    { url: settings.social_facebook, label: 'Facebook', icon: <Facebook size={34} className="text-[#1877F2]" /> },
    { url: settings.social_youtube, label: 'YouTube', icon: <Youtube size={36} className="text-[#FF0000]" /> },
  ].filter((s) => isRealProfile(s.url))

  function track(e: FormEvent) {
    e.preventDefault()
    const t = ticket.trim()
    navigate(t ? `/track?ticket=${encodeURIComponent(t)}` : '/track')
  }

  const phones = [settings.phone_primary, settings.phone_secondary].filter(Boolean)

  return (
    // On phones the quick-action bar is fixed to the bottom of the screen;
    // the footer's own padding runs behind it so its grey reaches the edge.
    <footer
      id="site-footer"
      className="st relative z-10 border-t border-[var(--st-line)] bg-[var(--st-footer)] pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0"
    >
      <div className="st-container grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[0.92fr_1fr_1fr_1fr] lg:gap-0 lg:py-0">
        {/* about + track */}
        <div className="lg:pb-[50px] lg:pr-[30px] lg:pt-10">
          <Link to="/">
            <Wordmark />
          </Link>
          <p className="mt-5 max-w-xs text-[15px] font-medium leading-[1.8] text-[var(--st-muted)] lg:text-[16px]">
            Phones, accessories and same-day repairs on Ratu Road, Ranchi — since {settings.established || '2005'}.
          </p>

          <form onSubmit={track} className="mt-6 flex max-w-sm" role="search" aria-label="Track your repair">
            <label htmlFor="footer-ticket" className="sr-only">Repair ticket number</label>
            <input
              id="footer-ticket"
              value={ticket}
              onChange={(e) => setTicket(e.target.value.toUpperCase())}
              placeholder="Your ticket, e.g. VMS-7K4PQ2"
              maxLength={14}
              autoComplete="off"
              className="min-w-0 flex-1 border border-r-0 border-[var(--st-line)] bg-white px-4 py-3 text-[14px] text-black outline-none placeholder:text-black/40 focus:border-black"
            />
            <button type="submit" className="flex w-12 shrink-0 items-center justify-center bg-black text-white transition-colors hover:bg-[var(--st-accent-ink)]" aria-label="Track repair">
              <ArrowRight size={18} />
            </button>
          </form>

          {/* The official coloured marks, so they read as WhatsApp and
              Instagram at a glance. */}
          <div className="-ml-1 mt-6 flex items-center gap-2">
            <a
              href={whatsappLink(settings)}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-11 w-11 items-center justify-center transition-transform hover:-translate-y-0.5"
              aria-label="Chat with us on WhatsApp"
            >
              <WhatsAppLogo size={34} />
            </a>
            {socials.map(({ url, label, icon }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-11 w-11 items-center justify-center transition-transform hover:-translate-y-0.5"
                aria-label={`${settings.shop_name} on ${label}`}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        <div className="lg:border-l lg:border-[var(--st-line)] lg:px-[30px] lg:pb-[50px] lg:pt-10">
          <h2 className="st-foot-title">Shop</h2>
          <ul className="mt-[22px] space-y-[9px]">
            {SHOP_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:border-l lg:border-[var(--st-line)] lg:px-[30px] lg:pb-[50px] lg:pt-10">
          <h2 className="st-foot-title">Repairs</h2>
          <ul className="mt-[22px] space-y-[9px]">
            {REPAIR_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:border-l lg:border-[var(--st-line)] lg:pb-[50px] lg:pl-[30px] lg:pt-10">
          <h2 className="st-foot-title">Visit us</h2>
          <address className="mt-[22px] space-y-3 text-[15px] font-medium not-italic leading-[1.8] text-[var(--st-muted)]">
            <p>{fullAddress(settings)}</p>
            <p>
              Mon&ndash;Sat {settings.hours_weekday}
              <br />
              Sunday {settings.hours_sunday}
            </p>
            <p className="flex flex-col">
              {phones.map((phone) => (
                <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`} className="py-1 text-black transition-colors hover:text-[var(--st-accent-ink)]">
                  {phone}
                </a>
              ))}
            </p>
            <p className="flex flex-col">
              <a href={mapDirectionsUrl(settings)} target="_blank" rel="noreferrer noopener" className="py-1 text-black transition-colors hover:text-[var(--st-accent-ink)]">
                Find us on Google Maps
              </a>
              {googleReviewUrl(settings) && (
                <a href={googleReviewUrl(settings)} target="_blank" rel="noreferrer noopener" className="py-1 text-black transition-colors hover:text-[var(--st-accent-ink)]">
                  Review us on Google
                </a>
              )}
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-[var(--st-line)]">
        <div className="st-container flex flex-col gap-3 py-4 text-[14px] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[var(--st-muted)]">
            &copy; {year} {settings.shop_name}, {settings.city || 'Ranchi'}.{' '}
            <Link to="/admin" className="inline-flex items-center gap-1 transition-colors hover:text-black">
              <Lock size={12} /> Staff login
            </Link>
          </p>
          <ul className="flex flex-wrap items-center gap-2" aria-label="Ways to pay">
            {PAYMENTS.map((p) => (
              <li key={p} className="border border-black/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-black/60">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
