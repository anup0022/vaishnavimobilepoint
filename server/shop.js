/*
 * Small helpers over the shop's CMS settings, shared by the structured data
 * (seo.js) and the server-rendered pages (prerender.js). They mirror the
 * client's lib/useSettings.tsx so a link means the same thing in both.
 */

export function tel(phone) {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`
}

export function whatsappLink(s, message = 'Hi! I have a question about my phone.') {
  return `https://wa.me/${encodeURIComponent(s.whatsapp || '')}?text=${encodeURIComponent(message)}`
}

export function fullAddress(s) {
  return [s.address_line1, s.address_line2, `${s.city || ''} ${s.pincode || ''}`.trim(), s.state].filter(Boolean).join(', ')
}

/**
 * A profile link worth publishing: http(s) only (a "javascript:" URL saved in
 * the CMS must never become a link), and not a bare https://facebook.com/,
 * which is the seed's placeholder rather than a page.
 */
export function isRealProfile(url) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.pathname.replace(/\/+$/, '').length > 0
  } catch {
    return false
  }
}

/*
 * Settings safe to publish in pages and /api/settings. The GSTIN is shown on
 * no public page, and the seed's value is a placeholder rather than the
 * shop's number; the CMS reads it from /api/admin/settings.
 */
const PRIVATE_SETTINGS = new Set(['gst'])

export function publicSettings(s) {
  return Object.fromEntries(Object.entries(s).filter(([key]) => !PRIVATE_SETTINGS.has(key)))
}

/*
 * The settings the storefront actually reads (client/src, outside admin/),
 * which every page embeds for its first render. A list rather than "all but
 * a few", so stray or test keys in the table never ride along in the HTML.
 * A key missing here still arrives a moment later from /api/settings.
 */
const STOREFRONT_KEYS = [
  'shop_name', 'hero_sub', 'announcement', 'established',
  'phone_primary', 'phone_secondary', 'whatsapp', 'email',
  'address_line1', 'address_line2', 'city', 'state', 'pincode', 'plus_code',
  'map_query', 'latitude', 'longitude', 'google_place_id',
  'hours_weekday', 'hours_sunday', 'closed_day',
  'about_lead', 'about_body', 'stats_customers', 'stats_repairs', 'stats_brands', 'stats_years',
  'social_instagram', 'social_facebook', 'social_youtube',
]

export function storefrontSettings(s) {
  return Object.fromEntries(STOREFRONT_KEYS.filter((key) => Object.hasOwn(s, key)).map((key) => [key, s[key]]))
}

export function socialProfiles(s) {
  return [s.social_instagram, s.social_facebook, s.social_youtube].filter(isRealProfile)
}

const PLACE_ID = /^[\w-]{10,200}$/

function placeId(s) {
  const id = String(s.google_place_id || '').trim()
  return PLACE_ID.test(id) ? id : ''
}

/** The Google Business Profile's review form, when the place ID is known. */
export function googleReviewUrl(s) {
  const id = placeId(s)
  return id ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}` : ''
}

/** The shop on Google Maps: the listing itself when known, else the pin. */
export function mapsUrl(s) {
  const id = placeId(s)
  if (id) {
    const name = encodeURIComponent(s.shop_name || 'Vaishnavi Mobile Point')
    return `https://www.google.com/maps/search/?api=1&query=${name}&query_place_id=${encodeURIComponent(id)}`
  }
  const lat = Number.parseFloat(s.latitude)
  const lng = Number.parseFloat(s.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(s))}`
}

/** Years since the founding year in the CMS, or null when it is not a year. */
export function yearsOpen(s) {
  const founded = Number.parseInt(String(s.established ?? ''), 10)
  return Number.isFinite(founded) && founded > 1900 ? new Date().getFullYear() - founded : null
}
