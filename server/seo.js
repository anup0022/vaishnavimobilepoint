import { allSettings, db } from './db.js'
import { EPHEMERAL } from './util.js'

/**
 * Local-search plumbing: robots.txt, sitemap.xml and LocalBusiness JSON-LD.
 *
 * All of it is generated from the CMS settings, so changing the phone number
 * or hours in the admin updates what Google reads — nothing is hardcoded.
 *
 * SITE_URL is the public origin once the site has a domain, e.g.
 * https://vaishnavimobilepoint.in — set it in docker-compose.yml.
 */

function siteUrl(req) {
  const configured = (process.env.SITE_URL || '').trim().replace(/\/+$/, '')
  if (configured) return configured
  // Fall back to whatever host the request came in on.
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http'
  return `${proto}://${req.headers.host}`
}

/** Pages worth indexing. The staff CMS is deliberately excluded. */
const PUBLIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/products', priority: '0.9', changefreq: 'daily' },
  { path: '/services', priority: '0.9', changefreq: 'monthly' },
  { path: '/book', priority: '0.8', changefreq: 'monthly' },
  { path: '/track', priority: '0.7', changefreq: 'monthly' },
  { path: '/feedback', priority: '0.7', changefreq: 'weekly' },
  { path: '/contact', priority: '0.8', changefreq: 'monthly' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/faq', priority: '0.6', changefreq: 'monthly' },
]

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])
}

export function robotsTxt(req) {
  const base = siteUrl(req)
  return [
    'User-agent: *',
    'Allow: /',
    // Keep the staff CMS and the API out of the index.
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')
}

export function sitemapXml(req, products = []) {
  const base = siteUrl(req)
  const urls = [
    ...PUBLIC_PATHS.map((p) => ({ loc: base + p.path, priority: p.priority, changefreq: p.changefreq })),
    ...products.map((p) => ({ loc: `${base}/products/${p.slug}`, priority: '0.7', changefreq: 'weekly' })),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`
}

/**
 * schema.org MobilePhoneStore markup. This is what puts the shop's hours,
 * phone and map pin into Google's local results, so the fields come straight
 * from the CMS rather than being duplicated here.
 */
export function localBusinessJsonLd(req) {
  const s = allSettings()
  const base = siteUrl(req)

  const openingHours = []
  if (s.hours_weekday) {
    const [opens, closes] = parseHours(s.hours_weekday)
    if (opens) {
      openingHours.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens, closes,
      })
    }
  }
  if (s.hours_sunday) {
    const [opens, closes] = parseHours(s.hours_sunday)
    if (opens) {
      openingHours.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday'], opens, closes })
    }
  }

  const data = {
    '@context': 'https://schema.org',
    '@type': 'MobilePhoneStore',
    name: s.shop_name,
    alternateName: [s.shop_name_local, 'Vaishnavi Mobile Center', 'Vaishnavi Dial Point'].filter(Boolean),
    description: s.tagline,
    url: base,
    telephone: [s.phone_primary, s.phone_secondary].filter(Boolean),
    email: s.email || undefined,
    foundingDate: s.established || undefined,
    image: `${base}/shop/banner-design-social.jpg`,
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: [s.address_line1, s.address_line2].filter(Boolean).join(', '),
      addressLocality: s.city,
      addressRegion: s.state,
      postalCode: s.pincode,
      addressCountry: 'IN',
    },
    geo: s.latitude && s.longitude
      ? { '@type': 'GeoCoordinates', latitude: s.latitude, longitude: s.longitude }
      : undefined,
    openingHoursSpecification: openingHours.length ? openingHours : undefined,
    sameAs: [s.social_facebook, s.social_instagram, s.social_youtube].filter(Boolean),
    areaServed: { '@type': 'City', name: 'Ranchi' },
  }

  // Drop undefined keys so the emitted JSON stays clean.
  return JSON.stringify(JSON.parse(JSON.stringify(data)))
}

/** "10:00 AM – 9:00 PM" -> ["10:00", "21:00"] */
function parseHours(text) {
  const matches = String(text).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi)
  if (!matches || matches.length < 2) return [null, null]
  return matches.slice(0, 2).map((m) => {
    const [, h, min = '00', ap] = m.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
    let hour = Number.parseInt(h, 10) % 12
    if (/pm/i.test(ap)) hour += 12
    return `${String(hour).padStart(2, '0')}:${min}`
  })
}

/* ------------------------------------------------------------------ *
 * Per-page titles and descriptions
 *
 * Every URL used to go out with the same <title> and description, so to a
 * search engine the whole site was one page. Google shows roughly 60
 * characters of a title and 155 of a description, so each one leads with
 * what the page is for and where — the shop competes on local searches.
 * Built per request from the CMS settings, so a changed phone number or
 * shop name reaches the snippets without a deploy.
 * ------------------------------------------------------------------ */

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

/** Cuts to snippet length on a word boundary. */
function clip(text, max = 155) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

function staticPages(s) {
  const shop = s.shop_name || 'Vaishnavi Mobile Point'
  const since = s.established || '2005'
  const where = 'Ratu Road, Ranchi'
  const phones = [s.phone_primary, s.phone_secondary].filter(Boolean).join(' or ')
  return {
    '/': {
      title: `${shop} — Phones & Repairs, ${where}`,
      description: `Smartphones, genuine accessories and same-day mobile repairs opposite Galaxia Mall, Churi Centre Gali, ${where}. Serving Ranchi since ${since}.`,
    },
    '/products': {
      title: `Phones & Accessories in Ranchi | ${shop}`,
      description: `Smartphones, tablets, smartwatches, earbuds and accessories at our ${where} shop. Sealed boxes, GST bill and the brand's own India warranty.`,
    },
    '/services': {
      title: `Mobile Phone Repair in Ranchi | ${shop}`,
      description: `Screen and battery replacement, charging port, water damage, camera and chip-level repair on ${where}. Estimate before work, written warranty.`,
    },
    // While the host cannot keep bookings (EPHEMERAL) these pages offer
    // WhatsApp and a phone call instead of a form, and say so in the snippet.
    '/book': {
      title: `Book a Mobile Repair | ${shop}, Ranchi`,
      description: EPHEMERAL
        ? clip(`Book your phone repair on WhatsApp or by phone (${phones}). Same-day screen and battery jobs at our ${where} bench.`)
        : `Book your phone repair online in two minutes and get a ticket number to track it. Same-day screen and battery jobs at our ${where} bench.`,
    },
    '/track': {
      title: `Track Your Repair | ${shop}, Ranchi`,
      description: EPHEMERAL
        ? clip(`Ask for an update on your repair on WhatsApp or by phone (${phones}) and we will tell you exactly where your device is.`)
        : 'See where your phone repair stands: enter your ticket number and the mobile number you booked with to see every update from our bench.',
    },
    '/feedback': {
      title: `Customer Reviews | ${shop}, Ranchi`,
      description: `What customers in Ranchi say about buying phones and getting repairs at ${shop}, ${where}.`,
    },
    '/contact': {
      title: `Contact & Directions | ${shop}, Ranchi`,
      description: clip(`Call ${phones}, WhatsApp us, or visit opposite Galaxia Mall, Churi Centre Gali, ${where} ${s.pincode || ''}. Hours and map inside.`),
    },
    '/about': {
      title: `About Us — Since ${since} | ${shop}`,
      description: `From one recharge counter in ${since} to a ${where} landmark: phones, accessories and an in-house repair bench that uses genuine parts only.`,
    },
    '/faq': {
      title: `Repair & Shopping FAQ | ${shop}, Ranchi`,
      description: 'Repair times, genuine parts, warranty, data recovery, exchanging old phones, EMI and card payments, GST invoices and repair tracking — answered.',
    },
  }
}

function productPage(shop, slug) {
  const p = db
    .prepare('SELECT name, description, price FROM products WHERE slug = ? AND active = 1')
    .get(slug)
  if (!p) return null
  const price = p.price > 0 ? ` at ${inr.format(p.price)}` : ''
  return {
    title: `${p.name} in Ranchi | ${shop}`,
    description: clip(`${p.name}${price} from ${shop}, Ratu Road, Ranchi. ${p.description}`),
    ogType: 'product',
  }
}

/*
 * Search Console and Bing Webmaster ownership tags, and the Google Analytics
 * measurement ID, come from the environment so nothing account-specific is
 * committed. Each is checked against its expected shape before it can reach
 * the HTML or the CSP.
 */
const GOOGLE_VERIFY = /^[\w-]{20,100}$/.test(process.env.GOOGLE_SITE_VERIFICATION || '') ? process.env.GOOGLE_SITE_VERIFICATION : ''
const BING_VERIFY = /^[\w-]{20,100}$/.test(process.env.BING_SITE_VERIFICATION || '') ? process.env.BING_SITE_VERIFICATION : ''
export const ANALYTICS_ID = /^G-[A-Z0-9]{4,20}$/.test(process.env.GA_MEASUREMENT_ID || '') ? process.env.GA_MEASUREMENT_ID : ''

/** Replaces the shell's own copy of a tag, wherever the build put it. */
function swap(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`)
}

/**
 * Stamps the built shell for one request: title, description, social card,
 * canonical URL, structured data — and the status code, because a URL that
 * matches no page must answer 404 rather than 200 with the home page's copy.
 */
export function renderPage(shell, req) {
  const s = allSettings()
  const shop = s.shop_name || 'Vaishnavi Mobile Point'
  const base = siteUrl(req)
  const path = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path
  const pages = staticPages(s)
  const admin = path === '/admin' || path.startsWith('/admin/')
  const notFound = {
    title: `Page not found | ${shop}`,
    description: `This page does not exist. Find phones, repairs and directions to ${shop} on Ratu Road, Ranchi.`,
  }

  let status = 200
  let noindex = false
  let meta = pages[path]
  if (!meta) {
    const product = path.match(/^\/products\/([a-z0-9-]+)$/)
    if (product) meta = productPage(shop, product[1])
    else if (admin) {
      meta = { title: `Staff CMS | ${shop}`, description: '' }
      noindex = true
    }
  }
  if (!meta) {
    meta = notFound
    status = 404
    noindex = true
  }

  const canonical = base + path
  const banner = `${base}/shop/banner-design-social.jpg`
  const title = escapeXml(meta.title)
  const description = escapeXml(meta.description || '')

  // What the client needs to keep the tab title right as people navigate.
  const clientMeta = {
    pages: Object.fromEntries(Object.entries(pages).map(([p, m]) => [p, { title: m.title, description: m.description }])),
    product: `{name} in Ranchi | ${shop}`,
    notFound,
    analytics: ANALYTICS_ID || undefined,
  }

  let html = shell
  html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
  html = swap(html, /<meta\s+name="description"[^>]*>/, `<meta name="description" content="${description}" />`)
  html = swap(html, /<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${meta.ogType || 'website'}" />`)
  html = swap(html, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`)
  html = swap(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${description}" />`)

  // The storefront is light and the staff CMS dark. Marking the CMS here
  // makes it paint dark from the first frame, before any script has run;
  // the client keeps the mark right when someone moves between the two.
  if (admin) html = html.replace(/<html\b([^>]*)>/, '<html$1 class="theme-admin">')
  html = swap(html, /<meta\s+name="theme-color"[^>]*>/, `<meta name="theme-color" content="${admin ? '#0a0c10' : '#ffffff'}" />`)

  const tags = [
    noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${escapeXml(canonical)}" />`,
    noindex ? '' : `<meta property="og:url" content="${escapeXml(canonical)}" />`,
    `<meta property="og:site_name" content="${escapeXml(shop)}" />`,
    // The designed banner is what shows when the link is shared on WhatsApp.
    `<meta property="og:image" content="${escapeXml(banner)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${escapeXml(banner)}" />`,
    status === 200 ? `<script type="application/ld+json">${localBusinessJsonLd(req)}</script>` : '',
    GOOGLE_VERIFY ? `<meta name="google-site-verification" content="${GOOGLE_VERIFY}" />` : '',
    BING_VERIFY ? `<meta name="msvalidate.01" content="${BING_VERIFY}" />` : '',
    // A meta tag rather than an inline script: script-src is 'self' with no
    // nonce, and the flag is not worth loosening the CSP for. Present in the
    // shell means the storefront never flashes a form it cannot submit.
    EPHEMERAL ? `<meta name="vmp-forms" content="offline" />` : '',
    // A JSON data block is never executed, so the CSP does not apply to it.
    // "<" is escaped so a product name can never close the tag.
    `<script type="application/json" id="vmp-meta">${JSON.stringify(clientMeta).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean).join('\n    ')

  return { status, html: html.replace('</head>', `    ${tags}\n  </head>`) }
}

export { PUBLIC_PATHS }
