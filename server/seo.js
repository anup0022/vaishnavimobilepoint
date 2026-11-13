import { allSettings, db } from './db.js'
import { EPHEMERAL } from './util.js'
import { SERVICES } from './content.js'
import { availability, CATEGORY_LABELS, hasRealPhoto } from './catalogue.js'
import { mapsUrl, socialProfiles, storefrontSettings } from './shop.js'
import { pageContent } from './prerender.js'

/**
 * Local-search plumbing: robots.txt, sitemap.xml, structured data and the
 * per-page head tags.
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
const PUBLIC_PATHS = ['/', '/products', '/services', '/book', '/track', '/feedback', '/contact', '/about', '/faq']

/**
 * "/faq///" -> "/faq". A loop rather than /\/+$/, which backtracks on every
 * slash in a long run of them and let one crafted URL hold the server.
 */
export function trimTrailingSlashes(path) {
  let end = path.length
  while (end > 1 && path.charCodeAt(end - 1) === 47) end--
  return path.slice(0, end)
}

/** An absolute http(s) URL for a stored image path, or undefined if it is not one. */
function absoluteUrl(value, base) {
  try {
    const url = new URL(value, `${base}/`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])
}

/*
 * robots.txt used to say "Disallow: /api/". Every catalogue page fetches its
 * product from /api, and Google's renderer obeys robots.txt for the requests
 * a page makes, so Googlebot rendered all 24 product pages as "Item not
 * found". The API is now crawlable; its responses carry
 * "X-Robots-Tag: noindex" instead (server/index.js), which keeps raw JSON out
 * of results without hiding it from the renderer.
 *
 * /admin is no longer disallowed either: a blocked URL can still be indexed
 * from a link, because the crawler never sees its noindex. Every /admin page
 * now answers with a noindex header and meta tag that crawlers can read.
 */
export function robotsTxt(req) {
  const base = siteUrl(req)
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n')
}

/** "2026-11-10 21:12:02" (SQLite, UTC) -> "2026-11-10" */
function day(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ''))
  return match ? match[1] : null
}

/** The later of two "YYYY-MM-DD" days, either of which may be missing. */
function later(a, b) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

/**
 * <lastmod> is the one sitemap hint Google and Bing still use, and only while
 * it stays accurate; <priority> and <changefreq> are ignored, so they are
 * gone. A product URL dates from its row's last change. Pages change with a
 * deploy (`builtAt`, the client build), and the pages that list live data
 * also when that data does: / and /products with the newest product change,
 * /feedback with the newest published review.
 */
export function sitemapXml(req, products = [], { builtAt = null, reviewsAt = null } = {}) {
  const base = siteUrl(req)
  const built = builtAt ? builtAt.toISOString().slice(0, 10) : null
  const newestProduct = products.map((p) => day(p.updated_at)).filter(Boolean).sort().pop() || null
  const pageDate = {
    '/': later(built, newestProduct),
    '/products': later(built, newestProduct),
    '/feedback': later(built, day(reviewsAt)),
  }
  const urls = [
    ...PUBLIC_PATHS.map((path) => ({ loc: base + path, lastmod: pageDate[path] ?? built })),
    ...products.map((p) => ({ loc: `${base}/products/${p.slug}`, lastmod: day(p.updated_at) })),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `
    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>
`
}

/* ------------------------------------------------------------------ *
 * Structured data
 *
 * One JSON-LD @graph per page. Every page carries the store (what puts the
 * shop's hours, phone and map pin into local results) and the website
 * (which gives Google the site name to show); product pages add the
 * product with its offer and a breadcrumb, and /services lists the repairs
 * with their published price ranges. The nodes refer to each other by @id,
 * so search engines read one connected description of one shop.
 * ------------------------------------------------------------------ */

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

function storeNode(s, base) {
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

  return {
    '@type': 'MobilePhoneStore',
    '@id': `${base}/#store`,
    name: s.shop_name,
    alternateName: [s.shop_name_local, 'Vaishnavi Mobile Center', 'Vaishnavi Dial Point'].filter(Boolean),
    description: s.tagline,
    url: `${base}/`,
    // One number per property: the second line is a contact point of its own.
    telephone: s.phone_primary || undefined,
    contactPoint: s.phone_secondary
      ? [{ '@type': 'ContactPoint', telephone: s.phone_secondary, contactType: 'customer service', areaServed: 'IN', availableLanguage: ['en', 'hi'] }]
      : undefined,
    email: s.email || undefined,
    foundingDate: s.established || undefined,
    // The storefront photo first: a promotional banner is not a picture of the shop.
    image: [`${base}/shop/shop-10.jpg`, `${base}/shop/banner-design-social.jpg`],
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
    hasMap: mapsUrl(s),
    openingHoursSpecification: openingHours.length ? openingHours : undefined,
    // Only real profiles: the seed's bare https://facebook.com/ claimed the
    // shop was Facebook itself.
    sameAs: socialProfiles(s),
    areaServed: { '@type': 'City', name: 'Ranchi' },
  }
}

function websiteNode(s, base) {
  return {
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: `${base}/`,
    name: s.shop_name,
    alternateName: s.shop_name_local || undefined,
    inLanguage: 'en-IN',
    publisher: { '@id': `${base}/#store` },
  }
}

const SCHEMA_AVAILABILITY = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/LimitedAvailability',
  out_of_stock: 'https://schema.org/OutOfStock',
}

/**
 * The breadcrumb, and — once the item has been checked — the product and its
 * offer.
 *
 * The catalogue is still the demo seed's: prices, MRPs and "in stock" that
 * the counter has not confirmed. Offer markup turns them into rich results
 * ("₹58,999 · In stock"), and marking up an offer the shop might not honour
 * is misleading structured data under Google's policies. So a product gets
 * its Product node only once staff upload its real photo (CMS > Stock),
 * which is when someone at the counter has had the item in hand and checked
 * its price. A product without a price never gets one: Google needs an
 * offer (or reviews) to use it.
 */
function productNodes(row, base, canonical) {
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${base}/products` },
      { '@type': 'ListItem', position: 3, name: row.name },
    ],
  }
  if (!(row.price > 0) || !hasRealPhoto(row)) return [breadcrumb]
  const product = {
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: row.name,
    description: row.description || undefined,
    sku: row.sku,
    brand: { '@type': 'Brand', name: row.brand },
    category: CATEGORY_LABELS[row.category] || row.category,
    image: absoluteUrl(row.image_url, base),
    offers: {
      '@type': 'Offer',
      url: canonical,
      price: row.price,
      priceCurrency: 'INR',
      availability: SCHEMA_AVAILABILITY[availability(row)],
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${base}/#store` },
    },
  }
  return [product, breadcrumb]
}

/** The published repair prices, as an offer catalogue of the store. */
function repairCatalogue(base) {
  return {
    '@type': 'OfferCatalog',
    '@id': `${base}/services#repairs`,
    name: 'Mobile phone repairs',
    itemListElement: SERVICES.map((service) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: service.title, description: service.detail },
      priceSpecification: service.priceMin
        ? {
            '@type': 'PriceSpecification',
            priceCurrency: 'INR',
            minPrice: service.priceMin,
            maxPrice: service.priceMax || undefined,
          }
        : undefined,
    })),
  }
}

/**
 * The page's JSON-LD block. Undefined keys are dropped, and "<" is escaped
 * so text from the CMS can never close the script tag.
 */
function structuredData(req, path, canonical, product) {
  try {
    const s = allSettings()
    const base = siteUrl(req)
    const store = storeNode(s, base)
    if (path === '/services' && SERVICES.length) store.hasOfferCatalog = repairCatalogue(base)
    const graph = [store, websiteNode(s, base), ...(product ? productNodes(product, base, canonical) : [])]
    const json = JSON.stringify(JSON.parse(JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })))
    return json.replace(/</g, '\\u003c')
  } catch (err) {
    // Odd CMS data must cost the page its markup, never the page itself.
    console.error('[structured-data]', err.message)
    return ''
  }
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
      description: `From one recharge counter in ${since} to a ${where} landmark: phones, accessories and an in-house repair bench fitting original and service-pack parts.`,
    },
    '/faq': {
      title: `Repair & Shopping FAQ | ${shop}, Ranchi`,
      description: 'Repair times, genuine parts, warranty, data recovery, exchanging old phones, EMI and card payments, GST invoices and repair tracking — answered.',
    },
  }
}

/**
 * The client fills the same templates when someone moves between products
 * in the app (client/src/lib/pageMeta.ts), so the wording lives here only.
 */
function productTemplates(shop) {
  return {
    title: `{name} in Ranchi | ${shop}`,
    description: `{name}{price} from ${shop}, Ratu Road, Ranchi. {description}`,
  }
}

function productPage(shop, slug) {
  const row = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(slug)
  if (!row) return null
  const templates = productTemplates(shop)
  const price = row.price > 0 ? ` at ${inr.format(row.price)}` : ''
  return {
    title: templates.title.replace('{name}', () => row.name),
    description: clip(
      templates.description
        .replace('{name}', () => row.name)
        .replace('{price}', () => price)
        .replace('{description}', () => row.description),
    ),
    ogType: 'product',
    row,
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

/**
 * Replaces the shell's own copy of a tag, wherever the build put it.
 * Replacement functions throughout: a string replacement treats "$&", "$'"
 * and "$`" in CMS text as commands and would paste parts of the page into it.
 */
function swap(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`)
}

/**
 * Stamps the built shell for one request: title, description, social card,
 * canonical URL, structured data, the page's content in #root — and the
 * status code, because a URL that matches no page must answer 404 rather
 * than 200 with the home page's copy. `noindex` tells the caller to send the
 * matching X-Robots-Tag header.
 */
export function renderPage(shell, req) {
  const s = allSettings()
  const shop = s.shop_name || 'Vaishnavi Mobile Point'
  const base = siteUrl(req)
  const path = trimTrailingSlashes(req.path)
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
  const templates = productTemplates(shop)
  const jsonLd = noindex ? '' : structuredData(req, path, canonical, meta.row)

  // What the client needs to keep the tab title right as people navigate.
  const clientMeta = {
    pages: Object.fromEntries(Object.entries(pages).map(([p, m]) => [p, { title: m.title, description: m.description }])),
    product: templates.title,
    productDescription: templates.description,
    notFound,
    analytics: ANALYTICS_ID || undefined,
    // The settings the storefront reads, so the first render already has the
    // offer bar, hours and phone numbers instead of growing the page when
    // /api/settings answers (client/src/lib/useSettings.tsx).
    settings: storefrontSettings(s),
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
    // Only the home page loads Unsplash photography (its hero slides), and its
    // largest image is the first of them: open that connection early.
    path === '/' ? '<link rel="preconnect" href="https://images.unsplash.com" />' : '',
    jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : '',
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

  html = html.replace('</head>', () => `    ${tags}\n  </head>`)
  // The page's own content, for crawlers and readers that never run the app
  // (prerender.js). React replaces it on its first render.
  html = html.replace(/<div id="root"><\/div>/, () => `<div id="root">${pageContent(path, status)}</div>`)

  return { status, noindex, html }
}

export { PUBLIC_PATHS }
