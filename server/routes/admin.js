import express from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { db, setSetting, allSettings, STATUS_FLOW, STATUS_LABELS } from '../db.js'
import { verifyPassword, hashPassword, signToken, verifyToken, rateLimit, slugify, asInt, asFloat, needsRehash } from '../util.js'

export const adminRouter = express.Router()

const COOKIE = 'vms_session'
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

/* ------------------------------- auth ------------------------------ */

function requireAuth(req, res, next) {
  const payload = verifyToken(req.cookies?.[COOKIE])
  if (!payload) return res.status(401).json({ error: 'Please sign in to continue.' })
  req.user = payload
  next()
}

// Hashed once at boot so a login for a username that does not exist still
// pays the same scrypt cost as a real one. The value is never a valid password.
const DECOY_HASH = hashPassword(crypto.randomBytes(32).toString('hex'))

adminRouter.post('/login', rateLimit({ key: 'login', max: 8, windowMs: 10 * 60_000 }), (req, res) => {
  const { username, password } = req.body || {}
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(String(username || '').trim())

  /*
   * An unknown username used to return in ~33ms while a known one spent ~300ms
   * inside scrypt, which told anyone timing the endpoint exactly which
   * usernames exist. Hash against a decoy when there is no user, so both paths
   * do the same work.
   */
  const ok = user
    ? verifyPassword(String(password || ''), user.password_hash)
    : (verifyPassword(String(password || ''), DECOY_HASH), false)

  if (!ok) {
    return res.status(401).json({ error: 'Incorrect username or password.' })
  }

  // The password was just proven correct, so this is the one moment we can
  // rewrite an old, cheaper hash at the current cost without asking anyone to
  // change anything.
  if (needsRehash(user.password_hash)) {
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')
      .run(hashPassword(String(password)), user.id)
  }

  const token = signToken({ id: user.id, username: user.username, name: user.name, role: user.role })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Over TLS the cookie must never be sent in the clear. Conditional rather
    // than hardcoded so the site still works on http://localhost, where a
    // `secure` cookie would simply be dropped and nobody could sign in.
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  })
  res.json({ ok: true, user: { username: user.username, name: user.name, role: user.role } })
})

adminRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: _req.secure || _req.headers['x-forwarded-proto'] === 'https',
  })
  res.json({ ok: true })
})

adminRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: { username: req.user.username, name: req.user.name, role: req.user.role } })
})

adminRouter.post('/password', requireAuth, (req, res) => {
  const { current, next: nextPassword } = req.body || {}
  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user.id)
  if (!user || !verifyPassword(String(current || ''), user.password_hash)) {
    return res.status(400).json({ error: 'Your current password is not correct.' })
  }
  if (String(nextPassword || '').length < 8) {
    return res.status(400).json({ error: 'The new password must be at least 8 characters.' })
  }
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hashPassword(String(nextPassword)), user.id)
  res.json({ ok: true, message: 'Password updated.' })
})

// Everything below this line needs a signed-in staff member.
adminRouter.use(requireAuth)

/* ----------------------------- dashboard --------------------------- */

adminRouter.get('/stats', (_req, res) => {
  const stock = db.prepare(`
    SELECT COUNT(*) AS items,
           COALESCE(SUM(stock_qty), 0) AS units,
           COALESCE(SUM(stock_qty * price), 0) AS value
    FROM products WHERE active = 1
  `).get()

  const lowStock = db
    .prepare('SELECT id, name, sku, stock_qty, low_stock FROM products WHERE active = 1 AND stock_qty <= low_stock ORDER BY stock_qty ASC')
    .all()

  const bookingsByStatus = db.prepare('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status').all()
  const openBookings = db.prepare(
    "SELECT COUNT(*) AS n FROM bookings WHERE status NOT IN ('delivered', 'cancelled')",
  ).get().n

  const pendingReviews = db.prepare('SELECT COUNT(*) AS n FROM feedback WHERE approved = 0').get().n
  const unreadMessages = db.prepare('SELECT COUNT(*) AS n FROM contact_messages WHERE handled = 0').get().n

  const recentBookings = db
    .prepare('SELECT id, ticket, customer_name, device_brand, device_model, issue_type, status, created_at FROM bookings ORDER BY id DESC LIMIT 6')
    .all()

  const recentMovements = db.prepare(`
    SELECT m.id, m.kind, m.qty, m.balance, m.note, m.actor, m.created_at, p.name AS product_name
    FROM stock_movements m JOIN products p ON p.id = m.product_id
    ORDER BY m.id DESC LIMIT 8
  `).all()

  const topCategories = db
    .prepare('SELECT category, COUNT(*) AS items, COALESCE(SUM(stock_qty),0) AS units FROM products WHERE active = 1 GROUP BY category ORDER BY units DESC')
    .all()

  res.json({
    stock,
    lowStock,
    bookingsByStatus,
    openBookings,
    pendingReviews,
    unreadMessages,
    recentBookings,
    recentMovements,
    topCategories,
  })
})

/* ------------------------------ products --------------------------- */

adminRouter.get('/products', (req, res) => {
  const q = String(req.query.q || '').trim()
  const rows = q
    ? db.prepare('SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? OR brand LIKE ? ORDER BY id DESC').all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM products ORDER BY id DESC').all()

  res.json({
    products: rows.map((r) => ({ ...r, specs: safeJson(r.specs, []), featured: !!r.featured, active: !!r.active })),
  })
})

function safeJson(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normaliseSpecs(specs) {
  if (Array.isArray(specs)) return specs.map((s) => String(s).slice(0, 120)).filter(Boolean)
  if (typeof specs === 'string') return specs.split('\n').map((s) => s.trim()).filter(Boolean)
  return []
}

adminRouter.post('/products', (req, res) => {
  const b = req.body || {}
  if (!b.name || !b.brand || !b.category) {
    return res.status(400).json({ error: 'Name, brand and category are required.' })
  }

  let slug = slugify(b.slug || b.name)
  let suffix = 1
  while (db.prepare('SELECT id FROM products WHERE slug = ?').get(slug)) {
    slug = `${slugify(b.name)}-${++suffix}`
  }

  const sku = String(b.sku || '').trim() || `VMS-${String(b.category).slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-5)}`
  if (db.prepare('SELECT id FROM products WHERE sku = ?').get(sku)) {
    return res.status(400).json({ error: `SKU ${sku} already exists.` })
  }

  const qty = asInt(b.stock_qty, 0)
  const result = db.prepare(`
    INSERT INTO products (sku, slug, name, brand, category, description, price, mrp, stock_qty, low_stock, image_url, specs, featured, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sku, slug,
    String(b.name).trim().slice(0, 140),
    String(b.brand).trim().slice(0, 60),
    String(b.category).trim().slice(0, 40),
    String(b.description || '').slice(0, 2000),
    asFloat(b.price, 0),
    asFloat(b.mrp, 0),
    qty,
    asInt(b.low_stock, 3),
    String(b.image_url || '').slice(0, 500),
    JSON.stringify(normaliseSpecs(b.specs)),
    b.featured ? 1 : 0,
    b.active === false ? 0 : 1,
  )

  const id = Number(result.lastInsertRowid)
  if (qty !== 0) {
    db.prepare('INSERT INTO stock_movements (product_id, kind, qty, balance, note, actor) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, 'in', qty, qty, 'Opening stock on item creation', req.user.username,
    )
  }

  res.status(201).json({ ok: true, id, message: `${b.name} added to stock.` })
})

adminRouter.put('/products/:id', (req, res) => {
  const id = asInt(req.params.id)
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'Item not found.' })

  const b = req.body || {}
  const newQty = b.stock_qty === undefined ? existing.stock_qty : asInt(b.stock_qty, existing.stock_qty)

  db.prepare(`
    UPDATE products SET
      name = ?, brand = ?, category = ?, description = ?, price = ?, mrp = ?,
      stock_qty = ?, low_stock = ?, image_url = ?, specs = ?, featured = ?, active = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    String(b.name ?? existing.name).slice(0, 140),
    String(b.brand ?? existing.brand).slice(0, 60),
    String(b.category ?? existing.category).slice(0, 40),
    String(b.description ?? existing.description).slice(0, 2000),
    asFloat(b.price, existing.price),
    asFloat(b.mrp, existing.mrp),
    newQty,
    asInt(b.low_stock, existing.low_stock),
    String(b.image_url ?? existing.image_url).slice(0, 500),
    JSON.stringify(b.specs === undefined ? safeJson(existing.specs, []) : normaliseSpecs(b.specs)),
    b.featured === undefined ? existing.featured : (b.featured ? 1 : 0),
    b.active === undefined ? existing.active : (b.active ? 1 : 0),
    id,
  )

  if (newQty !== existing.stock_qty) {
    const delta = newQty - existing.stock_qty
    db.prepare('INSERT INTO stock_movements (product_id, kind, qty, balance, note, actor) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, 'adjust', delta, newQty, 'Quantity corrected while editing the item', req.user.username,
    )
  }

  res.json({ ok: true, message: 'Item updated.' })
})

adminRouter.delete('/products/:id', (req, res) => {
  const id = asInt(req.params.id)
  const row = db.prepare('SELECT name FROM products WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Item not found.' })
  db.prepare('DELETE FROM products WHERE id = ?').run(id)
  res.json({ ok: true, message: `${row.name} removed.` })
})

/** Record a stock in/out/adjustment against an item. */
adminRouter.post('/products/:id/stock', (req, res) => {
  const id = asInt(req.params.id)
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  if (!product) return res.status(404).json({ error: 'Item not found.' })

  const kind = String(req.body?.kind || 'in')
  const qty = asInt(req.body?.qty, 0)
  const note = String(req.body?.note || '').slice(0, 300)

  if (!['in', 'out', 'adjust'].includes(kind)) return res.status(400).json({ error: 'Unknown movement type.' })
  if (qty === 0) return res.status(400).json({ error: 'Enter a quantity.' })

  let balance
  let delta
  if (kind === 'adjust') {
    balance = Math.max(0, qty)
    delta = balance - product.stock_qty
  } else {
    delta = kind === 'in' ? Math.abs(qty) : -Math.abs(qty)
    balance = product.stock_qty + delta
    if (balance < 0) {
      return res.status(400).json({ error: `Only ${product.stock_qty} in stock — cannot remove ${Math.abs(qty)}.` })
    }
  }

  db.prepare("UPDATE products SET stock_qty = ?, updated_at = datetime('now') WHERE id = ?").run(balance, id)
  db.prepare('INSERT INTO stock_movements (product_id, kind, qty, balance, note, actor) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, kind, delta, balance, note || defaultNote(kind), req.user.username,
  )

  res.json({ ok: true, balance, message: `${product.name} is now at ${balance} unit${balance === 1 ? '' : 's'}.` })
})

function defaultNote(kind) {
  if (kind === 'in') return 'Stock received'
  if (kind === 'out') return 'Sold / issued'
  return 'Physical count adjustment'
}

adminRouter.get('/stock-movements', (req, res) => {
  const productId = asInt(req.query.product_id, 0)
  const rows = productId
    ? db.prepare(`
        SELECT m.*, p.name AS product_name, p.sku FROM stock_movements m
        JOIN products p ON p.id = m.product_id WHERE m.product_id = ? ORDER BY m.id DESC LIMIT 200
      `).all(productId)
    : db.prepare(`
        SELECT m.*, p.name AS product_name, p.sku FROM stock_movements m
        JOIN products p ON p.id = m.product_id ORDER BY m.id DESC LIMIT 200
      `).all()
  res.json({ movements: rows })
})

/* ------------------------------ uploads ---------------------------- */

/*
 * Uploads used to trust two things the caller controls: the multipart
 * Content-Type, and the extension on the supplied filename. Sending
 * `Content-Type: image/png` with `filename="x.js"` therefore wrote a .js file
 * into /uploads, which express.static then served as application/javascript
 * from this origin — a same-origin script, which the site's own
 * `script-src 'self'` policy allows. The CSP was one upload away from useless.
 *
 * Now nothing the caller says is believed. The file is buffered, its real type
 * is read from its leading bytes, and the extension is OUR choice from that.
 */
const IMAGE_TYPES = [
  { ext: '.jpg',  mime: 'image/jpeg', match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.png',  mime: 'image/png',  match: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: '.gif',  mime: 'image/gif',  match: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  { ext: '.webp', mime: 'image/webp', match: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { ext: '.avif', mime: 'image/avif', match: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' && b.subarray(8, 12).toString('latin1').startsWith('avif') },
]

function detectImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 16) return null
  return IMAGE_TYPES.find((t) => {
    try { return t.match(buf) } catch { return false }
  }) || null
}

// Held in memory so the bytes can be checked before anything touches the disk.
const upload = multer({
  limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 10 },
  storage: multer.memoryStorage(),
})

adminRouter.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image received.' })

  const kind = detectImage(req.file.buffer)
  if (!kind) {
    return res.status(400).json({ error: 'That file is not a JPG, PNG, GIF, WEBP or AVIF image.' })
  }

  // Name and extension are both ours. originalname is never used.
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${kind.ext}`
  // Into the database, not the uploads folder: on a host whose disk is wiped
  // the folder would lose the photo, while the database is backed up.
  db.prepare('INSERT INTO uploads (name, mime, data) VALUES (?, ?, ?)').run(filename, kind.mime, req.file.buffer)

  res.status(201).json({ ok: true, url: `/uploads/${filename}` })
})

/* ------------------------------ bookings --------------------------- */

adminRouter.get('/bookings', (req, res) => {
  const status = String(req.query.status || 'all')
  const q = String(req.query.q || '').trim()

  const where = []
  const params = []
  if (status === 'open') {
    where.push("status NOT IN ('delivered', 'cancelled')")
  } else if (status !== 'all') {
    where.push('status = ?')
    params.push(status)
  }
  if (q) {
    // IMEI too: the Track page tells customers who lost their ticket to call
    // with it.
    where.push('(ticket LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR device_model LIKE ? OR imei LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }

  const sql = `SELECT * FROM bookings ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC`
  const bookings = db.prepare(sql).all(...params)

  res.json({ bookings, statusFlow: STATUS_FLOW, statusLabels: STATUS_LABELS })
})

adminRouter.get('/bookings/:id', (req, res) => {
  const id = asInt(req.params.id)
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id)
  if (!booking) return res.status(404).json({ error: 'Ticket not found.' })
  const updates = db.prepare('SELECT * FROM booking_updates WHERE booking_id = ? ORDER BY id ASC').all(id)
  res.json({ booking, updates })
})

/*
 * Staff do one thing to a ticket: move it to a stage, optionally with a note
 * the customer reads on /track. Tickets are opened only by online booking,
 * and estimate, final amount and technician are not edited here — anything
 * else in the body is ignored rather than written.
 */
adminRouter.patch('/bookings/:id', (req, res) => {
  const id = asInt(req.params.id)
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id)
  if (!booking) return res.status(404).json({ error: 'Ticket not found.' })

  const b = req.body || {}
  const status = b.status ? String(b.status) : booking.status
  if (!STATUS_FLOW.includes(status) && status !== 'cancelled') {
    return res.status(400).json({ error: 'Unknown status.' })
  }

  // Capped by character, not UTF-16 unit, so an emoji is never cut in half.
  const note = Array.from(String(b.note || '').trim()).slice(0, 1200).join('')
  if (status === booking.status && !note) {
    return res.status(400).json({ error: 'Choose a new status or write a note for the customer.' })
  }

  db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id)
  db.prepare('INSERT INTO booking_updates (booking_id, status, note) VALUES (?, ?, ?)').run(
    id, status, note || `Status changed to ${STATUS_LABELS[status] || status}.`,
  )

  res.json({ ok: true, message: 'Status updated — the customer can see it on the tracking page.' })
})

adminRouter.delete('/bookings/:id', (req, res) => {
  const id = asInt(req.params.id)
  const row = db.prepare('SELECT ticket FROM bookings WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Ticket not found.' })
  db.prepare('DELETE FROM bookings WHERE id = ?').run(id)
  res.json({ ok: true, message: `Ticket ${row.ticket} deleted.` })
})

/* ------------------------------ feedback --------------------------- */

adminRouter.get('/feedback', (_req, res) => {
  res.json({ reviews: db.prepare('SELECT * FROM feedback ORDER BY approved ASC, id DESC').all() })
})

adminRouter.patch('/feedback/:id', (req, res) => {
  const id = asInt(req.params.id)
  const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Review not found.' })

  const b = req.body || {}
  db.prepare('UPDATE feedback SET approved = ?, title = ?, message = ?, rating = ? WHERE id = ?').run(
    b.approved === undefined ? row.approved : (b.approved ? 1 : 0),
    String(b.title ?? row.title).slice(0, 120),
    String(b.message ?? row.message).slice(0, 2000),
    Math.min(5, Math.max(1, asInt(b.rating, row.rating))),
    id,
  )
  res.json({ ok: true, message: b.approved ? 'Review published.' : 'Review updated.' })
})

adminRouter.delete('/feedback/:id', (req, res) => {
  db.prepare('DELETE FROM feedback WHERE id = ?').run(asInt(req.params.id))
  res.json({ ok: true, message: 'Review deleted.' })
})

/* ------------------------------ messages --------------------------- */

adminRouter.get('/messages', (_req, res) => {
  res.json({ messages: db.prepare('SELECT * FROM contact_messages ORDER BY handled ASC, id DESC').all() })
})

adminRouter.patch('/messages/:id', (req, res) => {
  db.prepare('UPDATE contact_messages SET handled = ? WHERE id = ?').run(
    req.body?.handled ? 1 : 0,
    asInt(req.params.id),
  )
  res.json({ ok: true })
})

adminRouter.delete('/messages/:id', (req, res) => {
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(asInt(req.params.id))
  res.json({ ok: true, message: 'Message deleted.' })
})

/* ------------------------- site content (CMS) ----------------------- */

adminRouter.get('/settings', (_req, res) => {
  res.json(allSettings())
})

adminRouter.put('/settings', (req, res) => {
  const body = req.body || {}
  let count = 0
  for (const [key, value] of Object.entries(body)) {
    if (!/^[a-z0-9_]{2,40}$/.test(key)) continue
    setSetting(key, typeof value === 'string' ? value.slice(0, 4000) : value)
    count++
  }
  res.json({ ok: true, message: `${count} field${count === 1 ? '' : 's'} saved. The website updates immediately.` })
})
