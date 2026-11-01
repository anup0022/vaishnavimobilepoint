import { allSettings } from './db.js'

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

/** Injects canonical URL, og:url and the JSON-LD block into the built shell. */
export function injectSeo(html, req) {
  const base = siteUrl(req)
  const canonical = base + (req.path === '/' ? '/' : req.path)
  const banner = `${base}/shop/banner-design-social.jpg`
  const tags = [
    `<link rel="canonical" href="${escapeXml(canonical)}" />`,
    `<meta property="og:url" content="${escapeXml(canonical)}" />`,
    // The designed banner is what shows when the link is shared on WhatsApp.
    `<meta property="og:image" content="${escapeXml(banner)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${escapeXml(banner)}" />`,
    `<script type="application/ld+json">${localBusinessJsonLd(req)}</script>`,
  ].join('\n    ')
  return html.replace('</head>', `    ${tags}\n  </head>`)
}

export { PUBLIC_PATHS }
