import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type Settings } from './api'

/** Fallbacks keep the site readable if the settings call ever fails. */
const DEFAULTS: Settings = {
  shop_name: 'Vaishnavi Mobile Point',
  tagline: 'Mobile Service Center — we deal in all kinds of mobile & accessories',
  phone_primary: '+91 91222 66808',
  whatsapp: '919122266808',
  email: 'rajeev.9x@gmail.com',
  address_line1: 'Churi Centre Lane (Churi Centre Gali)',
  address_line2: 'Opp Galaxia Mall, Ratu Road, Sukhdeo Nagar',
  city: 'Ranchi',
  state: 'Jharkhand',
  pincode: '834005',
  latitude: '23.3818672',
  longitude: '85.300538',
  // Shown on the home page from the first paint, so the intro band does not
  // grow once /api/settings answers.
  hero_sub:
    'Latest smartphones, genuine accessories and same-day repairs — in Churi Centre Gali, just off Ratu Road, Ranchi. Serving Ranchi since 2005.',
  hours_weekday: '10:00 AM – 9:00 PM',
  hours_sunday: '11:00 AM – 7:00 PM',
  google_place_id: 'ChIJ4VmjLcvh9DkRRQy08l85PIo',
  // What the shop has saved in Site Content, so the phone bottom bar shows
  // its Instagram button from the first paint instead of popping in.
  social_instagram: 'https://www.instagram.com/pointvaishnavimobile/',
}

const SettingsContext = createContext<{ settings: Settings; reload: () => void }>({
  settings: DEFAULTS,
  reload: () => {},
})

export function useSettings() {
  return useContext(SettingsContext).settings
}

export function useSettingsReload() {
  return useContext(SettingsContext).reload
}

/**
 * The server writes the current settings into the page (#vmp-meta), so the
 * first render matches the shop's real offer bar and hours. The request
 * below still runs, to pick up anything saved in the CMS since.
 */
function initialSettings(): Settings {
  try {
    const meta = JSON.parse(document.getElementById('vmp-meta')?.textContent || '{}') as { settings?: Settings }
    return { ...DEFAULTS, ...(meta.settings ?? {}) }
  } catch {
    return DEFAULTS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(initialSettings)

  function load() {
    api
      .get<Settings>('/api/settings')
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => {})
  }

  useEffect(load, [])

  return <SettingsContext.Provider value={{ settings, reload: load }}>{children}</SettingsContext.Provider>
}

/**
 * A profile link worth showing: http(s) only, so a "javascript:" URL saved in
 * the CMS never becomes a link, and not a bare https://facebook.com/, which is
 * the seed's placeholder rather than a page (server/shop.js agrees).
 */
export function isRealProfile(url: string | undefined): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.pathname.replace(/\/+$/, '').length > 0
  } catch {
    return false
  }
}

/** Builds the full postal address from the CMS fields. */
export function fullAddress(s: Settings): string {
  return [s.address_line1, s.address_line2, `${s.city} ${s.pincode}`, s.state].filter(Boolean).join(', ')
}

export function whatsappLink(s: Settings, message = 'Hi! I have a question about my phone.'): string {
  return `https://wa.me/${s.whatsapp || ''}?text=${encodeURIComponent(message)}`
}

/** Exact coordinates of the shop, so the pin lands on the right door. */
function coords(s: Settings): string | null {
  const lat = Number.parseFloat(s.latitude)
  const lng = Number.parseFloat(s.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : null
}

export function mapEmbedUrl(s: Settings): string {
  const point = coords(s)
  const q = point ?? (s.map_query || 'Vaishnavi+Mobile+Point+Ranchi')
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=17&output=embed`
}

/*
 * The shop's Google Business Profile is identified by its place ID (Site
 * Content > Google place ID). With it, "Directions" opens the listing itself,
 * with its reviews, photos and hours, rather than a bare pin, and customers
 * can be sent straight to the listing's review form.
 */
const PLACE_ID = /^[\w-]{10,200}$/

export function googleReviewUrl(s: Settings): string {
  const id = (s.google_place_id || '').trim()
  return PLACE_ID.test(id) ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}` : ''
}

export function mapDirectionsUrl(s: Settings): string {
  const id = (s.google_place_id || '').trim()
  if (PLACE_ID.test(id)) {
    const name = encodeURIComponent(s.shop_name || 'Vaishnavi Mobile Point')
    return `https://www.google.com/maps/search/?api=1&query=${name}&query_place_id=${encodeURIComponent(id)}`
  }
  const point = coords(s)
  return point
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point)}`
    : `https://www.google.com/maps/search/?api=1&query=${s.map_query || 'Vaishnavi+Mobile+Point+Ranchi'}`
}
