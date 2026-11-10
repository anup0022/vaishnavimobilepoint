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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)

  function load() {
    api
      .get<Settings>('/api/settings')
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => {})
  }

  useEffect(load, [])

  return <SettingsContext.Provider value={{ settings, reload: load }}>{children}</SettingsContext.Provider>
}

/** A bare https://facebook.com/ is the seed's placeholder, not a page. */
export function isRealProfile(url: string | undefined): url is string {
  if (!url) return false
  try {
    return new URL(url).pathname.replace(/\/+$/, '').length > 0
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

export function mapDirectionsUrl(s: Settings): string {
  const point = coords(s)
  return point
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point)}`
    : `https://www.google.com/maps/search/?api=1&query=${s.map_query || 'Vaishnavi+Mobile+Point+Ranchi'}`
}
