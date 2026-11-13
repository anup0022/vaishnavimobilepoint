import { db, allSettings } from './db.js'
import { EPHEMERAL } from './util.js'
import { SERVICES, FAQS, ABOUT } from './content.js'
import { availability, AVAILABILITY_LABELS, CATEGORY_LABELS, discount, relatedProducts, safeJson } from './catalogue.js'
import { tel, whatsappLink, mapsUrl, googleReviewUrl, socialProfiles, yearsOpen } from './shop.js'

/* ------------------------------------------------------------------ *
 * Page content in the HTML the server sends
 *
 * The storefront is a React app, so every page used to arrive as a title,
 * a description and an empty <div id="root">. Google runs the JavaScript
 * eventually; Bing often does not, and the assistants that read pages to
 * answer questions about local shops (ChatGPT, Perplexity, Claude, Copilot)
 * mostly never do. To all of them the shop had no address, no prices and no
 * products.
 *
 * Each public page now carries its real content inside #root as plain HTML:
 * the heading, the copy, prices, products, hours and address, built from the
 * same database rows and the same client/src/data files the React page
 * renders. Nothing appears here that the page itself does not show.
 *
 * React's createRoot empties #root on its first render, so visitors with
 * JavaScript get the app exactly as before. The block stays invisible for
 * its first second (the .ssr animation below): a fast load swaps it out
 * before anyone sees it, and on slow mobile data the shop's details show up
 * while the app is still downloading instead of a blank screen.
 * ------------------------------------------------------------------ */

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const money = (value) => inr.format(Number(value) || 0)
const count = (value) => Number(value).toLocaleString('en-IN')

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

const STYLE = `<style>
.ssr{font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111827;max-width:64rem;margin:0 auto;padding:0 1rem 3rem;animation:ssr-show 0s 1s both}
@keyframes ssr-show{from{visibility:hidden}to{visibility:visible}}
.ssr a{color:#0f5fbf}
.ssr-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1.5rem;padding:1rem 0;border-bottom:1px solid #e5e7eb}
.ssr-brand{font-weight:700;font-size:1.125rem;color:#111827!important;text-decoration:none}
.ssr nav{display:flex;flex-wrap:wrap;gap:.25rem 1rem;font-size:.95rem}
.ssr h1{font-size:clamp(1.75rem,5vw,2.5rem);line-height:1.2;margin:2rem 0 .75rem}
.ssr h2{font-size:1.25rem;line-height:1.3;margin:2rem 0 .5rem}
.ssr h3{font-size:1.05rem;margin:1.25rem 0 .25rem}
.ssr ul,.ssr ol{padding-left:1.25rem}
.ssr li{margin:.3rem 0}
.ssr blockquote{margin:.25rem 0 0;padding-left:.75rem;border-left:3px solid #e5e7eb}
.ssr address{font-style:normal}
.ssr-foot{margin-top:3rem;padding-top:1rem;border-top:1px solid #e5e7eb}
</style>`

/** The storefront's own navigation labels (client/src/components/Nav.tsx). */
const NAV = [
  ['/', 'Home'],
  ['/products', 'Shop'],
  ['/services', 'Repairs'],
  ['/book', 'Book Repair'],
  ['/track', 'Track Repair'],
  ['/feedback', 'Reviews'],
  ['/about', 'About'],
  ['/faq', 'FAQ'],
  ['/contact', 'Contact'],
]

/** The home page's category tiles (client/src/pages/Home.tsx). */
const HOME_CATEGORIES = [
  ['smartphone', 'Smartphones'],
  ['audio', 'Earbuds & Headphones'],
  ['wearable', 'Smartwatches'],
  ['accessory', 'Chargers & Accessories'],
]

/* ----------------------------- data ------------------------------- */

function activeProducts() {
  return db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY featured DESC, id ASC').all()
}

function approvedReviews(limit) {
  return db
    .prepare('SELECT name, city, rating, title, message, service FROM feedback WHERE approved = 1 ORDER BY id DESC LIMIT ?')
    .all(limit)
}

/* ---------------------------- pieces ------------------------------ */

function hours(s) {
  return `Mon–Sat ${esc(s.hours_weekday)} · Sunday ${esc(s.hours_sunday || 'closed')}`
}

function contactLinks(s, message) {
  const links = []
  if (s.phone_primary) links.push(`<a href="${esc(tel(s.phone_primary))}">Call ${esc(s.phone_primary)}</a>`)
  if (s.whatsapp) links.push(`<a href="${esc(whatsappLink(s, message))}">WhatsApp us</a>`)
  links.push(`<a href="${esc(mapsUrl(s))}">Directions</a>`)
  return `<p>${links.join(' · ')}</p>`
}

/** A catalogue line as the product cards show it: name, price, struck MRP, stock label. */
function productLine(p) {
  const off = discount(p)
  const mrp = off > 0 ? ` <s>${money(p.mrp)}</s> (${off}% off)` : ''
  return `<li><a href="/products/${esc(p.slug)}">${esc(p.name)}</a>: ${money(p.price)}${mrp} · ${AVAILABILITY_LABELS[availability(p)]}</li>`
}

/** A home-page line as the home cards show it: name, price and struck MRP only. */
function homeLine(p) {
  const mrp = p.mrp > p.price ? ` <s>${money(p.mrp)}</s>` : ''
  return `<li><a href="/products/${esc(p.slug)}">${esc(p.name)}</a>: ${money(p.price)}${mrp}</li>`
}

function productList(rows, line = productLine) {
  return rows.length ? `<ul>${rows.map(line).join('')}</ul>` : ''
}

function reviewBlock(r, heading) {
  const by = `${r.rating} out of 5 · ${esc(r.name)}, ${esc(r.city)}${r.service ? ` · ${esc(r.service)}` : ''}`
  const title = r.title ? `<${heading}>${esc(r.title)}</${heading}>` : ''
  return `<article>${title}<p>${by}</p><blockquote>${esc(r.message)}</blockquote></article>`
}

function header(s, path) {
  const links = NAV.map(([href, label]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ''}>${esc(label)}</a>`)
  return `<header class="ssr-head"><a class="ssr-brand" href="/">${esc(s.shop_name)}</a><nav aria-label="Main">${links.join('')}</nav></header>`
}

/** The storefront footer's "Visit us" column (client/src/components/Footer.tsx). */
function footer(s) {
  const phones = [s.phone_primary, s.phone_secondary]
    .filter(Boolean)
    .map((p) => `<a href="${esc(tel(p))}">${esc(p)}</a>`)
    .join(' · ')
  const social = socialProfiles(s)
    .map((url) => `<a href="${esc(url)}" rel="noopener">${esc(new URL(url).hostname.replace(/^www\./, ''))}</a>`)
    .join(' · ')
  const review = googleReviewUrl(s)
  return `<footer class="ssr-foot">
<h2>Visit us</h2>
<address>${esc(s.shop_name)}<br>${esc(s.address_line1)}<br>${esc(s.address_line2)}<br>${esc(s.city)} ${esc(s.pincode)}, ${esc(s.state)}</address>
<p>${hours(s)}</p>
<p>${phones}</p>
<p><a href="${esc(mapsUrl(s))}">Find us on Google Maps</a>${review ? ` · <a href="${esc(review)}">Review us on Google</a>` : ''}${s.whatsapp ? ` · <a href="${esc(whatsappLink(s))}">WhatsApp</a>` : ''}${social ? ` · ${social}` : ''}</p>
</footer>`
}

/* ----------------------------- pages ------------------------------ */

function home(s) {
  const rows = activeProducts()
  const featured = rows.filter((p) => p.featured)
  const best = (featured.length ? featured : rows).slice(0, 8)
  const shown = new Set(best.map((p) => p.id))
  const deals = rows
    .filter((p) => !shown.has(p.id) && discount(p) > 0)
    .sort((a, b) => discount(b) - discount(a))
    .slice(0, 4)
  const battery = SERVICES.find((x) => x.title === 'Battery Replacement')
  const screen = SERVICES.find((x) => x.title === 'Screen Replacement')
  const repairFrom = [
    battery?.priceMin && `Battery from ${money(battery.priceMin)}`,
    screen?.priceMin && `Screen from ${money(screen.priceMin)}`,
  ].filter(Boolean).join(' · ')
  const reviews = approvedReviews(3)

  return `<h1>${esc(s.shop_name)} — phones, accessories and same-day mobile repairs on Ratu Road, Ranchi</h1>
${s.hero_sub ? `<p>${esc(s.hero_sub)}</p>` : ''}
<p>Open ${hours(s)}.</p>
${contactLinks(s)}
<h2>Shop by category</h2>
<ul>${HOME_CATEGORIES.map(([key, label]) => `<li><a href="/products?category=${key}">${esc(label)}</a></li>`).join('')}</ul>
<h2>Same-day repairs</h2>
<p>${repairFrom ? `${repairFrom}. ` : ''}Original and service-pack displays fitted in 60–90 minutes, with fresh waterproof adhesive and a written warranty slip.</p>
<p><a href="/book">Book a repair</a></p>
${best.length ? `<h2>Best seller</h2>${productList(best, homeLine)}` : ''}
${deals.length ? `<h2>Hot deal</h2>${productList(deals, homeLine)}` : ''}
${reviews.length ? `<h2>Testimonials</h2>${reviews.map((r) => reviewBlock(r, 'h3')).join('')}` : ''}`
}

function products(s) {
  const rows = activeProducts()
  const sections = Object.entries(CATEGORY_LABELS)
    .map(([category, label]) => {
      const items = rows.filter((p) => p.category === category)
      return items.length ? `<h2>${esc(label)}</h2>${productList(items)}` : ''
    })
    .join('')
  return `<h1>Catalogue — phones, accessories and audio in stock at ${esc(s.shop_name)}, Ranchi</h1>
${sections}`
}

function product(s, slug) {
  const p = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(slug)
  if (!p) return null
  const specs = safeJson(p.specs, [])
  const related = relatedProducts(db, p)
  const off = discount(p)
  const category = CATEGORY_LABELS[p.category] || p.category
  const enquiry = `Hi! I'm interested in the ${p.name} (${p.sku}) listed on your website. Is it available?`

  return `<nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/products">Shop</a> › ${esc(p.name)}</nav>
<h1>${esc(p.name)}</h1>
<p>${esc(p.brand)} · ${esc(category)} · ${AVAILABILITY_LABELS[availability(p)]} · Item code ${esc(p.sku)}</p>
<p><strong>${money(p.price)}</strong>${off > 0 ? ` <s>${money(p.mrp)}</s>, you save ${money(p.mrp - p.price)}` : ''}. Inclusive of all taxes. GST invoice provided.</p>
<p>${esc(p.description)}</p>
${specs.length ? `<h2>Specifications</h2><ul>${specs.map((spec) => `<li>${esc(spec)}</li>`).join('')}</ul>` : ''}
<h2>Reserve it over the phone</h2>
<p>We hold stock at the counter rather than selling online. Call or WhatsApp us and we will keep this aside for you today — bring a photo ID when you collect.</p>
${contactLinks(s, enquiry)}
${related.length ? `<h2>Also in ${esc(category)}</h2>${productList(related)}` : ''}`
}

function services(s) {
  return `<h1>Services &amp; charges</h1>
<p>Published prices, published timelines. The range depends on your model — we confirm the exact figure after diagnosis, before any work begins.</p>
${SERVICES.map((x) => `<section><h2>${esc(x.title)}</h2><p>${esc(x.detail)}</p><p>Price: ${esc(x.price)} · Time: ${esc(x.time)} · Warranty: ${esc(x.warranty)}</p></section>`).join('')}
<h2>Book it now, track it later</h2>
<p>Drop in at ${esc(s.address_line2 || 'our counter')} or book online and we will keep a slot on the bench for you.</p>
<p><a href="/book">Book a repair</a> · <a href="/track">Track existing repair</a></p>`
}

function book(s) {
  const intro = EPHEMERAL
    ? 'Send us the make, model and what went wrong. We reply the same day with an estimate.'
    : 'Three short steps. You get a ticket number instantly and can follow every stage of the repair online.'
  return `<h1>Book a repair</h1>
<p>${intro}</p>
${EPHEMERAL ? '<h2>Book your repair on WhatsApp</h2><p>The quickest way to reach the bench. Send your device details and a photo of the damage, and we will come back with a price before you travel.</p>' : ''}
${contactLinks(s, 'Hi! I would like to book a repair. Device: ')}
<p>Prefer to talk? Call <a href="${esc(tel(s.phone_primary))}">${esc(s.phone_primary)}</a> — we are open ${esc(s.hours_weekday)} Monday to Saturday and ${esc(s.hours_sunday || 'closed')} on Sunday.</p>`
}

function track(s) {
  const intro = EPHEMERAL
    ? 'Send us your ticket number or the mobile number you gave us, and we will tell you exactly where your device is.'
    : 'Enter the ticket number from your booking along with the mobile number you gave us. Both must match before we show any details.'
  return `<h1>Track your repair</h1>
<p>${intro}</p>
${EPHEMERAL ? '<h2>Ask us for an update</h2><p>We will check the bench and come straight back to you with the stage your repair is at and when it will be ready.</p>' : ''}
${contactLinks(s, 'Hi! Could I get an update on my repair? Ticket number: ')}`
}

function feedback(s) {
  const reviews = approvedReviews(30)
  const total = db.prepare('SELECT COUNT(*) AS n, AVG(rating) AS avg FROM feedback WHERE approved = 1').get()
  const google = googleReviewUrl(s)
  const summary = total.n
    ? `<p>${(Math.round(total.avg * 10) / 10).toFixed(1)} out of 5, from ${total.n} review${total.n === 1 ? '' : 's'}.</p>${reviews.map((r) => reviewBlock(r, 'h2')).join('')}`
    : `<h2>No reviews on this site yet</h2><p>Bought a phone or had a repair with us? Yours can be the first${google ? ' — here or on Google.' : '.'}</p>`
  return `<h1>What Ranchi says about us</h1>
<p>Unedited reviews left on this site. We publish the three-star ones too — you should know what you are walking into.</p>
${google ? `<p><a href="${esc(google)}">Review us on Google</a></p>` : ''}
${summary}`
}

function contact(s) {
  return `<h1>Contact us</h1>
<p>Call, message or simply walk in. We are opposite Galaxia Mall in Churi Centre Gali, off Ratu Road, open every day of the week.</p>
<h2>Shop details</h2>
<address>${esc(s.shop_name)}<br>${esc(s.address_line1)}<br>${esc(s.address_line2)}<br>${esc(s.city)} ${esc(s.pincode)}, ${esc(s.state)}</address>
<p>${hours(s)}</p>
${s.plus_code ? `<p>Plus Code: ${esc(s.plus_code)}</p>` : ''}
${contactLinks(s)}
${s.email ? `<p>Email: <a href="mailto:${esc(s.email)}">${esc(s.email)}</a></p>` : ''}`
}

function about(s) {
  const years = yearsOpen(s) ?? (Number(s.stats_years) || 0)
  const stats = [
    [`${count(Number(s.stats_customers) || 24000)}+`, 'Customers served'],
    [`${count(Number(s.stats_repairs) || 38500)}+`, 'Devices repaired'],
    [count(Number(s.stats_brands) || 12), 'Brands stocked'],
    [count(years), 'Years in Ranchi'],
  ]
  return `<h1>Keeping Ranchi connected</h1>
${s.about_lead ? `<p>${esc(s.about_lead)}</p>` : ''}
<ul>${stats.map(([value, label]) => `<li><strong>${value}</strong> ${label}</li>`).join('')}</ul>
<h2>A shop built on repeat customers</h2>
${s.about_body ? `<p>${esc(s.about_body)}</p>` : ''}
<h2>${years} years, one street</h2>
<ol>${ABOUT.timeline.map((t) => `<li><strong>${esc(t.year)}: ${esc(t.title)}.</strong> ${esc(t.text)}</li>`).join('')}</ol>
<h2>Four rules we do not bend</h2>
<ul>${ABOUT.values.map((v) => `<li><strong>${esc(v.title)}.</strong> ${esc(v.text)}</li>`).join('')}</ul>
<h2>Come see us in person</h2>
<p>Opposite Galaxia Mall, Churi Centre Gali, Ratu Road. Open seven days a week.</p>
<p><a href="/book">Book a repair</a> · <a href="/contact">Contact &amp; directions</a></p>`
}

function faq(s) {
  return `<h1>Frequently asked</h1>
<p>The things customers ask us at the counter every week.</p>
${FAQS.map((f) => `<h2>${esc(f.q)}</h2><p>${esc(f.a)}</p>`).join('')}
<h2>Still not answered?</h2>
<p>Message us on WhatsApp — someone at the counter usually replies within a few minutes during shop hours.</p>
${contactLinks(s)}`
}

function notFound() {
  return `<h1>404</h1>
<h2>No signal on this page</h2>
<p>The page you were after has moved or never existed. Let's get you back to something useful.</p>
<p><a href="/">Back home</a> · <a href="/products">Browse the shop</a></p>`
}

const PAGES = {
  '/': home,
  '/products': products,
  '/services': services,
  '/book': book,
  '/track': track,
  '/feedback': feedback,
  '/contact': contact,
  '/about': about,
  '/faq': faq,
}

/**
 * The HTML that goes inside #root for `path`, or '' for the staff CMS.
 * A failure here must never take the page down with it, so it degrades to
 * the empty shell the site served before.
 */
export function pageContent(path, status) {
  if (path === '/admin' || path.startsWith('/admin/')) return ''
  try {
    const s = allSettings()
    let main = null
    if (status === 200) {
      const build = PAGES[path]
      if (build) main = build(s)
      else {
        const match = path.match(/^\/products\/([a-z0-9-]+)$/)
        if (match) main = product(s, match[1])
      }
    }
    if (main == null) main = notFound()
    return `<div class="ssr">${STYLE}${header(s, path)}<main>${main}</main>${footer(s)}</div>`
  } catch (err) {
    console.error('[prerender]', err.message)
    return ''
  }
}
