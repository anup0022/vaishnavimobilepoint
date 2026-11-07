import express from 'express'
import { db, allSettings, STATUS_FLOW, STATUS_LABELS } from '../db.js'
import { createCaptcha, verifyCaptcha, rateLimit, ticketCode, normalisePhone, EPHEMERAL } from '../util.js'

export const publicRouter = express.Router()

/* ------------------------------------------------------------------ *
 * Ephemeral hosting
 *
 * Bookings, enquiries and reviews are written to SQLite and nowhere
 * else — there is no mail or webhook behind them. On a host whose
 * filesystem does not survive a restart, accepting those writes is
 * worse than refusing them: the customer gets a ticket number, and the
 * shop never sees the job. See EPHEMERAL in util.js.
 * ------------------------------------------------------------------ */
function rejectIfEphemeral(_req, res, next) {
  if (!EPHEMERAL) return next()
  res.status(503).json({
    error: 'Online forms are switched off right now. Please WhatsApp or call the shop — we answer the same day.',
  })
}

/* ------------------------------------------------------------------ *
 * The public catalogue deliberately never returns stock_qty. Shoppers
 * see a coarse availability label; the real numbers stay behind the
 * admin login.
 * ------------------------------------------------------------------ */

function availability(row) {
  if (row.stock_qty <= 0) return 'out_of_stock'
  if (row.stock_qty <= row.low_stock) return 'low_stock'
  return 'in_stock'
}

function toPublicProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description,
    price: row.price,
    mrp: row.mrp,
    discount: row.mrp > row.price ? Math.round(((row.mrp - row.price) / row.mrp) * 100) : 0,
    image_url: row.image_url,
    specs: safeJson(row.specs, []),
    featured: !!row.featured,
    availability: availability(row),
  }
}

function safeJson(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

publicRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'vaishnavi-mobile-shop', time: new Date().toISOString() })
})

publicRouter.get('/settings', (_req, res) => {
  res.json(allSettings())
})

publicRouter.get('/captcha', rateLimit({ key: 'captcha', max: 60, windowMs: 60_000 }), (_req, res) => {
  const { id, svg } = createCaptcha()
  res.json({ id, svg })
})

/* ---------------------------- catalogue ---------------------------- */

publicRouter.get('/products', (req, res) => {
  const { category, brand, q, sort, featured } = req.query
  const where = ['active = 1']
  const params = []

  if (category && category !== 'all') {
    where.push('category = ?')
    params.push(String(category))
  }
  if (brand && brand !== 'all') {
    where.push('brand = ?')
    params.push(String(brand))
  }
  if (featured === 'true') where.push('featured = 1')
  if (q) {
    where.push('(name LIKE ? OR brand LIKE ? OR description LIKE ?)')
    const like = `%${String(q)}%`
    params.push(like, like, like)
  }

  const order =
    sort === 'price_asc' ? 'price ASC'
    : sort === 'price_desc' ? 'price DESC'
    : sort === 'name' ? 'name ASC'
    : 'featured DESC, id ASC'

  const rows = db.prepare(`SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${order}`).all(...params)

  const facets = {
    categories: db.prepare('SELECT category, COUNT(*) AS n FROM products WHERE active = 1 GROUP BY category ORDER BY category').all(),
    brands: db.prepare('SELECT brand, COUNT(*) AS n FROM products WHERE active = 1 GROUP BY brand ORDER BY brand').all(),
  }

  res.json({ products: rows.map(toPublicProduct), facets })
})

publicRouter.get('/products/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(req.params.slug)
  if (!row) return res.status(404).json({ error: 'Product not found' })

  const related = db
    .prepare('SELECT * FROM products WHERE category = ? AND id != ? AND active = 1 ORDER BY featured DESC LIMIT 4')
    .all(row.category, row.id)

  res.json({ product: toPublicProduct(row), related: related.map(toPublicProduct) })
})

/* ---------------------------- feedback ----------------------------- */

publicRouter.get('/feedback', (_req, res) => {
  const reviews = db.prepare('SELECT id, name, city, rating, title, message, avatar_url, service, created_at FROM feedback WHERE approved = 1 ORDER BY id DESC').all()
  const agg = db.prepare('SELECT COUNT(*) AS total, AVG(rating) AS avg FROM feedback WHERE approved = 1').get()
  const breakdown = db.prepare('SELECT rating, COUNT(*) AS n FROM feedback WHERE approved = 1 GROUP BY rating').all()

  res.json({
    reviews,
    total: agg.total,
    average: agg.avg ? Math.round(agg.avg * 10) / 10 : 0,
    breakdown,
  })
})

publicRouter.post('/feedback', rejectIfEphemeral, rateLimit({ key: 'feedback', max: 5, windowMs: 10 * 60_000 }), (req, res) => {
  const { name, city, rating, title, message, service, captchaId, captchaText } = req.body || {}

  if (!verifyCaptcha(captchaId, captchaText)) {
    return res.status(400).json({ error: 'The security code did not match. Please try the new code.' })
  }
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Please enter your name.' })
  if (!message || String(message).trim().length < 15) {
    return res.status(400).json({ error: 'Please write at least 15 characters about your experience.' })
  }

  const stars = Math.min(5, Math.max(1, Number.parseInt(rating, 10) || 5))

  db.prepare(
    'INSERT INTO feedback (name, city, rating, title, message, service, approved) VALUES (?, ?, ?, ?, ?, ?, 0)',
  ).run(
    String(name).trim().slice(0, 80),
    String(city || 'Ranchi').trim().slice(0, 80),
    stars,
    String(title || '').trim().slice(0, 120),
    String(message).trim().slice(0, 2000),
    String(service || '').trim().slice(0, 80),
  )

  res.status(201).json({ ok: true, message: 'Thank you! Your review has been sent for approval and will appear shortly.' })
})

/* ----------------------------- contact ----------------------------- */

publicRouter.post('/contact', rejectIfEphemeral, rateLimit({ key: 'contact', max: 5, windowMs: 10 * 60_000 }), (req, res) => {
  const { name, phone, email, subject, message, captchaId, captchaText } = req.body || {}

  if (!verifyCaptcha(captchaId, captchaText)) {
    return res.status(400).json({ error: 'The security code did not match. Please try the new code.' })
  }
  if (!name || !message) return res.status(400).json({ error: 'Name and message are both required.' })
  if (!phone && !email) return res.status(400).json({ error: 'Please leave a phone number or an email so we can reply.' })

  db.prepare('INSERT INTO contact_messages (name, phone, email, subject, message) VALUES (?, ?, ?, ?, ?)').run(
    String(name).trim().slice(0, 80),
    String(phone || '').trim().slice(0, 20),
    String(email || '').trim().slice(0, 120),
    String(subject || 'General enquiry').trim().slice(0, 140),
    String(message).trim().slice(0, 2000),
  )

  res.status(201).json({ ok: true, message: 'Message received. We usually reply the same working day.' })
})

/* ------------------------- service bookings ------------------------ */

export const ISSUE_TYPES = [
  'Screen Replacement',
  'Battery Replacement',
  'Charging Port Repair',
  'Water Damage Repair',
  'Motherboard Repair',
  'Camera Repair',
  'Speaker / Mic Issue',
  'Software / Data Recovery',
  'Network / IMEI Issue',
  'Other',
]

publicRouter.get('/service-options', (_req, res) => {
  res.json({ issueTypes: ISSUE_TYPES, statusFlow: STATUS_FLOW, statusLabels: STATUS_LABELS })
})

publicRouter.post('/bookings', rejectIfEphemeral, rateLimit({ key: 'booking', max: 6, windowMs: 10 * 60_000 }), (req, res) => {
  const {
    name, phone, email, deviceBrand, deviceModel, imei,
    issueType, issueDesc, preferredDate, captchaId, captchaText,
  } = req.body || {}

  if (!verifyCaptcha(captchaId, captchaText)) {
    return res.status(400).json({ error: 'The security code did not match. Please try the new code.' })
  }

  const cleanPhone = normalisePhone(phone)
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Please enter your full name.' })
  if (cleanPhone.length !== 10) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' })
  if (!deviceBrand || !deviceModel) return res.status(400).json({ error: 'Tell us the device brand and model.' })
  if (!issueType) return res.status(400).json({ error: 'Please choose what needs fixing.' })

  const ticket = ticketCode()
  const result = db.prepare(`
    INSERT INTO bookings (ticket, customer_name, phone, email, device_brand, device_model, imei, issue_type, issue_desc, preferred_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received')
  `).run(
    ticket,
    String(name).trim().slice(0, 80),
    cleanPhone,
    String(email || '').trim().slice(0, 120),
    String(deviceBrand).trim().slice(0, 40),
    String(deviceModel).trim().slice(0, 60),
    String(imei || '').replace(/\D/g, '').slice(0, 15),
    String(issueType).slice(0, 60),
    String(issueDesc || '').trim().slice(0, 1200),
    String(preferredDate || '').slice(0, 30),
  )

  db.prepare('INSERT INTO booking_updates (booking_id, status, note) VALUES (?, ?, ?)').run(
    Number(result.lastInsertRowid),
    'received',
    'Booking created online. Please bring the device to the counter, or call us for a pickup.',
  )

  res.status(201).json({
    ok: true,
    ticket,
    message: 'Booking confirmed. Save your ticket number — you will need it to track the repair.',
  })
})

/* --------------------------- status tracking ------------------------ */

publicRouter.post('/track', rateLimit({ key: 'track', max: 20, windowMs: 10 * 60_000 }), (req, res) => {
  const { ticket, phone, captchaId, captchaText } = req.body || {}

  if (!verifyCaptcha(captchaId, captchaText)) {
    return res.status(400).json({ error: 'The security code did not match. Please try the new code.' })
  }

  const code = String(ticket || '').trim().toUpperCase()
  const cleanPhone = normalisePhone(phone)

  if (!code) return res.status(400).json({ error: 'Please enter your ticket number.' })
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter the 10-digit mobile number used at booking.' })
  }

  // Both the ticket and the registered phone must match, so a guessed
  // ticket number alone never exposes someone else's repair details.
  const booking = db.prepare('SELECT * FROM bookings WHERE ticket = ? AND phone = ?').get(code, cleanPhone)
  if (!booking) {
    return res.status(404).json({ error: 'No repair found for that ticket and mobile number. Please check both and try again.' })
  }

  const updates = db
    .prepare('SELECT status, note, created_at FROM booking_updates WHERE booking_id = ? ORDER BY id ASC')
    .all(booking.id)

  res.json({
    booking: {
      ticket: booking.ticket,
      customer_name: booking.customer_name,
      device: `${booking.device_brand} ${booking.device_model}`,
      issue_type: booking.issue_type,
      issue_desc: booking.issue_desc,
      status: booking.status,
      estimate_amount: booking.estimate_amount,
      final_amount: booking.final_amount,
      technician: booking.technician,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    },
    updates,
    statusFlow: STATUS_FLOW,
    statusLabels: STATUS_LABELS,
  })
})

/* ------------------------------ stats ------------------------------ */

publicRouter.get('/stats', (_req, res) => {
  const products = db.prepare('SELECT COUNT(*) AS n FROM products WHERE active = 1').get().n
  const brands = db.prepare('SELECT COUNT(DISTINCT brand) AS n FROM products WHERE active = 1').get().n
  const reviews = db.prepare('SELECT COUNT(*) AS n, AVG(rating) AS avg FROM feedback WHERE approved = 1').get()
  res.json({
    products,
    brands,
    reviews: reviews.n,
    rating: reviews.avg ? Math.round(reviews.avg * 10) / 10 : 0,
  })
})
