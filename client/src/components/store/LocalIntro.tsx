import { Clock, MapPin, Phone } from 'lucide-react'
import { WhatsApp } from '@/components/BrandIcons'
import { mapDirectionsUrl, useSettings, whatsappLink } from '@/lib/useSettings'

/**
 * Who, where and when, in words. Most visitors arrive from a local search
 * ("mobile shop Ratu Road", "phone repair near me"), and the home page used
 * to answer with product photography only: its one heading was hidden from
 * sight, and the address and hours lived in the footer. This band carries
 * the page's H1, the intro from Site Content, today's hours and the three
 * ways to reach the counter. The server sends the same text in the page's
 * HTML (server/prerender.js), so crawlers read what visitors see.
 */
export default function LocalIntro() {
  const settings = useSettings()
  const phone = settings.phone_primary || ''

  return (
    <section className="bg-white px-5 py-[50px] text-center lg:py-[70px]" aria-labelledby="home-heading">
      <div className="mx-auto max-w-[880px]">
        <h1 id="home-heading" className="text-[24px] font-medium leading-[1.35] tracking-[0.01em] text-black md:text-[30px]">
          {settings.shop_name} — phones, accessories and same-day mobile repairs on Ratu Road, Ranchi
        </h1>
        {settings.hero_sub && <p className="mt-5 text-[17px] leading-[1.8] text-[var(--st-body)]">{settings.hero_sub}</p>}
        <p className="mt-4 text-[15px] text-[var(--st-muted)]">
          <Clock size={16} className="mr-1.5 inline-block align-[-3px]" aria-hidden="true" />
          Open Mon–Sat {settings.hours_weekday} · Sunday {settings.hours_sunday || 'closed'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {phone && (
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="st-btn">
              <Phone size={17} aria-hidden="true" /> Call {phone}
            </a>
          )}
          <a href={whatsappLink(settings)} target="_blank" rel="noreferrer noopener" className="st-btn">
            <WhatsApp size={17} /> WhatsApp us
          </a>
          <a href={mapDirectionsUrl(settings)} target="_blank" rel="noreferrer noopener" className="st-btn">
            <MapPin size={17} aria-hidden="true" /> Directions
          </a>
        </div>
      </div>
    </section>
  )
}
