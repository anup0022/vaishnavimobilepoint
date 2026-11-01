import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock, Lock, MessageCircle } from 'lucide-react'
import { Facebook, Instagram, Youtube } from './BrandIcons'
import { useSettings, fullAddress, whatsappLink } from '@/lib/useSettings'

const SHOP_LINKS = [
  { to: '/products?category=smartphone', label: 'Smartphones' },
  { to: '/products?category=tablet', label: 'Tablets' },
  { to: '/products?category=wearable', label: 'Smartwatches' },
  { to: '/products?category=audio', label: 'Audio' },
  { to: '/products?category=accessory', label: 'Accessories' },
]

const HELP_LINKS = [
  { to: '/services', label: 'Repair Services' },
  { to: '/book', label: 'Book a Repair' },
  { to: '/track', label: 'Track Your Repair' },
  { to: '/feedback', label: 'Customer Reviews' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact Us' },
]

export default function Footer() {
  const settings = useSettings()
  const year = new Date().getFullYear()

  return (
    <footer id="site-footer" className="relative mt-24 overflow-hidden border-t border-ink-700 bg-ink-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-ink-700" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-extrabold text-white">
                V
              </span>
              <div>
                <div className="font-display text-lg font-bold">{settings.shop_name}</div>
                <div className="text-xs text-mist-500">{settings.tagline}</div>
              </div>
            </div>

            <p className="mb-6 max-w-sm text-sm leading-relaxed text-mist-400">
              Authorised stock from every major brand and an in-house repair bench, serving Ranchi since{' '}
              {settings.established || '2011'}.
            </p>

            <div className="flex gap-3">
              {[
                { href: settings.social_facebook, Icon: Facebook, label: 'Facebook' },
                { href: settings.social_instagram, Icon: Instagram, label: 'Instagram' },
                { href: settings.social_youtube, Icon: Youtube, label: 'YouTube' },
                { href: whatsappLink(settings), Icon: MessageCircle, label: 'WhatsApp' },
              ]
                .filter((s) => s.href)
                .map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 text-mist-400 transition hover:border-brand-700/50 hover:bg-brand-600/15 hover:text-mist-50"
                  >
                    <Icon size={17} />
                  </a>
                ))}
            </div>
          </div>

          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-mist-50">Shop</h3>
            <ul className="space-y-3">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-mist-400 transition hover:text-brand-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-mist-50">Help</h3>
            <ul className="space-y-3">
              {HELP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-mist-400 transition hover:text-brand-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-mist-50">Visit the shop</h3>
            <ul className="space-y-4 text-sm text-mist-400">
              <li className="flex gap-3">
                <MapPin size={17} className="mt-0.5 shrink-0 text-brand-700" />
                <span className="leading-relaxed">{fullAddress(settings)}</span>
              </li>
              <li className="flex gap-3">
                <Phone size={17} className="mt-0.5 shrink-0 text-brand-700" />
                <span className="flex flex-col">
                  <a href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`} className="hover:text-mist-50">
                    {settings.phone_primary}
                  </a>
                  {settings.phone_secondary && (
                    <a href={`tel:${settings.phone_secondary.replace(/\s/g, '')}`} className="hover:text-mist-50">
                      {settings.phone_secondary}
                    </a>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <Mail size={17} className="mt-0.5 shrink-0 text-brand-700" />
                <a href={`mailto:${settings.email}`} className="hover:text-mist-50">
                  {settings.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock size={17} className="mt-0.5 shrink-0 text-brand-700" />
                <span className="leading-relaxed">
                  Mon&ndash;Sat {settings.hours_weekday}
                  <br />
                  Sunday {settings.hours_sunday}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-ink-700 pt-7 text-xs text-mist-500 sm:flex-row">
          <p>
            &copy; {year} {settings.shop_name}. GSTIN {settings.gst}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/faq" className="transition hover:text-mist-200">
              FAQ
            </Link>
            <Link to="/contact" className="transition hover:text-mist-200">
              Contact
            </Link>
            {/* Staff entrance — intentionally understated, and the CMS itself
                is behind a login, so customers never see stock figures. */}
            <Link to="/admin" className="flex items-center gap-1.5 transition hover:text-mist-200">
              <Lock size={11} />
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
