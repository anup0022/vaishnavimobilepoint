import crypto from 'node:crypto'

/**
 * The host's filesystem does not survive a restart (a Render free instance
 * spins down after 15 minutes idle). Bookings, enquiries and reviews are
 * written to SQLite and nowhere else, so when this is set those writes are
 * refused and the storefront offers WhatsApp and the phone number instead.
 * Unset it the moment the service has a persistent disk.
 */
export const EPHEMERAL = /^(1|true|yes)$/i.test(process.env.EPHEMERAL || '')

/* ------------------------------------------------------------------ *
 * Passwords — scrypt from node:crypto, no native dependency needed.
 * ------------------------------------------------------------------ */

/*
 * scrypt cost. The old code called scryptSync with Node's defaults (N=16384)
 * and stored only `salt:hash`, so the parameters were implicit — raising them
 * later would have silently invalidated every existing password.
 *
 * The hash now carries the parameters it was made with, so the cost can be
 * raised whenever hardware moves on and old hashes keep verifying. N=65536
 * costs roughly 150ms per attempt here, which is unnoticeable on a login and
 * expensive in bulk.
 */
const SCRYPT = { N: 65536, r: 8, p: 1, keylen: 64 }
// scrypt needs roughly 128 * N * r bytes; Node's default cap is below that at N=65536.
const SCRYPT_MAXMEM = 192 * SCRYPT.N * SCRYPT.r

function scrypt(plain, salt, { N, r, p, keylen }) {
  return crypto.scryptSync(plain, salt, keylen, { N, r, p, maxmem: 192 * N * r })
}

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = scrypt(plain, salt, SCRYPT).toString('hex')
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${hash}`
}

export function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false

  let salt, hash, params
  if (stored.startsWith('scrypt$')) {
    const [, N, r, p, s, h] = stored.split('$')
    params = { N: Number(N), r: Number(r), p: Number(p), keylen: 64 }
    if (!params.N || !params.r || !params.p) return false
    salt = s
    hash = h
  } else if (stored.includes(':')) {
    // Hashes written before the parameters were recorded. Node's defaults.
    ;[salt, hash] = stored.split(':')
    params = { N: 16384, r: 8, p: 1, keylen: 64 }
  } else {
    return false
  }
  if (!salt || !hash) return false

  let candidate
  try {
    candidate = scrypt(plain, salt, params)
  } catch {
    return false
  }
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return crypto.timingSafeEqual(candidate, expected)
}

/** True when a stored hash predates the current cost and should be rewritten. */
export function needsRehash(stored) {
  return typeof stored === 'string' && !stored.startsWith(`scrypt$${SCRYPT.N}$`)
}

/* ------------------------------------------------------------------ *
 * Sessions — a compact HMAC-signed token kept in an httpOnly cookie.
 * ------------------------------------------------------------------ */

/*
 * The session cookie is a stateless HMAC token, so whoever knows this key can
 * mint an admin session without a password. It used to fall back to a string
 * written in this file, which meant a deployment that forgot to set
 * SESSION_SECRET was wide open to anyone who had seen the source.
 *
 * In production we now refuse to start. In development we generate a random
 * key per boot: sessions do not survive a restart, which is a fair price for
 * never having a default worth guessing.
 */
const WEAK_SECRETS = new Set([
  '',
  'vaishnavi-dev-secret',
  'change-me-vaishnavi-ranchi-secret-key',
  'changeme',
  'change-me',
  'secret',
  'password',
])

function resolveSecret() {
  const given = (process.env.SESSION_SECRET || '').trim()
  const unusable = WEAK_SECRETS.has(given.toLowerCase()) || given.length < 32

  if (process.env.NODE_ENV === 'production') {
    if (unusable) {
      throw new Error(
        'SESSION_SECRET is missing, too short, or still set to a placeholder.\n' +
        'Anyone who knows it can sign in as the owner without a password.\n' +
        'Generate one with:  openssl rand -hex 32\n' +
        'then put it in the .env file next to docker-compose.yml.',
      )
    }
    return given
  }

  if (unusable) {
    console.warn('[auth] No strong SESSION_SECRET set — using a random key for this run. Sessions end when the server restarts.')
    return crypto.randomBytes(32).toString('hex')
  }
  return given
}

const SECRET = resolveSecret()

function b64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

export function signToken(payload, ttlSeconds = 60 * 60 * 12) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 }))
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/** Minimal cookie parser so we don't pull in cookie-parser. */
export function cookies(req, _res, next) {
  const header = req.headers.cookie || ''
  const jar = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (!key) continue
    const raw = part.slice(idx + 1).trim()
    // A client can send any bytes here; decodeURIComponent throws on things
    // like "%ZZ", which used to surface as a 500 on every request carrying it.
    try {
      jar[key] = decodeURIComponent(raw)
    } catch {
      jar[key] = raw
    }
  }
  req.cookies = jar
  next()
}

/* ------------------------------------------------------------------ *
 * CAPTCHA — generated as an SVG so it never leaves this machine and
 * needs no third-party service. Answers live in memory and expire.
 * ------------------------------------------------------------------ */

// Characters that can't be confused with each other (no 0/O, 1/I/l).
const CAPTCHA_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const captchaStore = new Map()
const CAPTCHA_TTL_MS = 10 * 60 * 1000

function randInt(min, max) {
  return min + Math.floor(crypto.randomInt(0, 10000) / 10000 * (max - min + 1))
}

function pick(arr) {
  return arr[crypto.randomInt(0, arr.length)]
}

/*
 * A stroke font for the CAPTCHA.
 *
 * The old version drew each answer character as its own <text> element, in
 * order, so the answer was sitting in the SVG as readable markup — one regex
 * over the response recovered it without any image processing at all. (The
 * project's own test script used exactly that trick.) Drawing the characters
 * as line geometry instead means the response contains coordinates and
 * nothing else.
 *
 * Each glyph is polylines on a 10x14 grid; "|" separates one stroke from the
 * next. This is not OCR-proof — no image CAPTCHA is — but it restores the
 * requirement to actually process a picture.
 */
const GLYPH_STROKES = {
  A: '0,14 5,0 10,14|2,9 8,9',
  B: '0,0 0,14|0,0 7,0 9,2 9,5 7,7 0,7|0,7 7,7 9,9 9,12 7,14 0,14',
  C: '10,2 7,0 3,0 0,3 0,11 3,14 7,14 10,12',
  D: '0,0 0,14|0,0 6,0 10,4 10,10 6,14 0,14',
  E: '10,0 0,0 0,14 10,14|0,7 7,7',
  F: '10,0 0,0 0,14|0,7 7,7',
  G: '10,2 7,0 3,0 0,3 0,11 3,14 7,14 10,11 10,8 6,8',
  H: '0,0 0,14|10,0 10,14|0,7 10,7',
  J: '10,0 10,11 7,14 3,14 0,11',
  K: '0,0 0,14|10,0 0,7|0,7 10,14',
  M: '0,14 0,0 5,7 10,0 10,14',
  N: '0,14 0,0 10,14 10,0',
  P: '0,14 0,0 7,0 10,3 7,7 0,7',
  Q: '3,0 7,0 10,3 10,11 7,14 3,14 0,11 0,3 3,0|6,10 10,14',
  R: '0,14 0,0 7,0 10,3 7,7 0,7|5,7 10,14',
  S: '10,2 7,0 3,0 0,3 3,6 7,8 10,11 7,14 3,14 0,12',
  T: '0,0 10,0|5,0 5,14',
  U: '0,0 0,11 3,14 7,14 10,11 10,0',
  V: '0,0 5,14 10,0',
  W: '0,0 2,14 5,5 8,14 10,0',
  X: '0,0 10,14|10,0 0,14',
  Y: '0,0 5,7 10,0|5,7 5,14',
  Z: '0,0 10,0 0,14 10,14',
  2: '0,3 3,0 7,0 10,3 10,5 0,14 10,14',
  3: '0,1 3,0 8,0 10,3 7,7 10,10 8,14 3,14 0,13',
  4: '7,14 7,0 0,9 10,9',
  5: '10,0 0,0 0,6 6,6 10,9 8,14 3,14 0,12',
  6: '9,2 6,0 2,3 0,8 1,12 4,14 7,14 10,11 9,8 5,7 1,9',
  7: '0,0 10,0 4,14',
  8: '4,0 7,0 9,2 9,5 5,7 1,9 1,12 4,14 7,14 9,12 9,9 5,7 1,5 1,2 4,0',
  9: '1,12 4,14 8,11 10,6 9,2 6,0 3,0 0,3 1,6 5,7 9,5',
}

/** One glyph as SVG path data, scaled to `size` and placed at the origin. */
function glyphPath(ch, size) {
  const def = GLYPH_STROKES[ch]
  if (!def) return ''
  const k = size / 14
  return def
    .split('|')
    .map((stroke) => {
      const pts = stroke.split(' ').map((pt) => {
        const [x, y] = pt.split(',').map(Number)
        // a little per-point jitter so the same letter is never the same shape
        return `${((x - 5) * k + randInt(-1, 1)).toFixed(1)} ${((y - 7) * k + randInt(-1, 1)).toFixed(1)}`
      })
      return `M${pts.join('L')}`
    })
    .join('')
}

export function createCaptcha() {
  let text = ''
  for (let i = 0; i < 5; i++) text += CAPTCHA_ALPHABET[crypto.randomInt(0, CAPTCHA_ALPHABET.length)]

  const id = crypto.randomUUID()
  captchaStore.set(id, { text, expires: Date.now() + CAPTCHA_TTL_MS, attempts: 0 })

  const width = 220
  const height = 72
  const palette = ['#a78bfa', '#67e8f9', '#fbbf24', '#f472b6', '#4ade80']

  let glyphs = ''
  text.split('').forEach((ch, i) => {
    const x = 26 + i * 38 + randInt(-4, 4)
    const y = 36 + randInt(-5, 5)
    const rotate = randInt(-26, 26)
    const size = randInt(30, 40)
    const d = glyphPath(ch, size)
    if (!d) return
    glyphs += `<path d="${d}" transform="translate(${x} ${y}) rotate(${rotate})" stroke="${pick(palette)}" stroke-width="${randInt(2, 3)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  })

  // Fragments of other glyphs, so shape-matching has decoys to chew on too.
  for (let i = 0; i < 4; i++) {
    const decoy = CAPTCHA_ALPHABET[crypto.randomInt(0, CAPTCHA_ALPHABET.length)]
    const d = glyphPath(decoy, randInt(18, 26))
    if (!d) continue
    glyphs += `<path d="${d}" transform="translate(${randInt(10, width - 10)} ${randInt(10, height - 10)}) rotate(${randInt(-70, 70)})" stroke="${pick(palette)}" stroke-opacity="0.25" stroke-width="1.5" fill="none"/>`
  }

  let noise = ''
  for (let i = 0; i < 6; i++) {
    const x1 = randInt(0, width)
    const y1 = randInt(0, height)
    const x2 = randInt(0, width)
    const y2 = randInt(0, height)
    const cx = randInt(0, width)
    const cy = randInt(0, height)
    noise += `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" stroke="${pick(palette)}" stroke-opacity="0.45" stroke-width="${randInt(1, 2)}" fill="none"/>`
  }
  for (let i = 0; i < 40; i++) {
    noise += `<circle cx="${randInt(0, width)}" cy="${randInt(0, height)}" r="${randInt(1, 2)}" fill="${pick(palette)}" fill-opacity="0.4"/>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Security code image">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#0f1226"/><stop offset="100%" stop-color="#1c1340"/>
</linearGradient></defs>
<rect width="${width}" height="${height}" rx="12" fill="url(#bg)"/>
${noise}${glyphs}
</svg>`

  return { id, svg }
}

export function verifyCaptcha(id, answer) {
  const entry = captchaStore.get(id)
  if (!entry) return false
  // Single-use: burn it whatever the outcome, so a wrong guess can't be retried.
  captchaStore.delete(id)
  if (entry.expires < Date.now()) return false
  if (typeof answer !== 'string') return false
  return answer.trim().toUpperCase() === entry.text
}

setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of captchaStore) {
    if (entry.expires < now) captchaStore.delete(id)
  }
}, 60 * 1000).unref()

/* ------------------------------------------------------------------ *
 * Simple in-memory rate limiting for the public write endpoints.
 * ------------------------------------------------------------------ */

const buckets = new Map()

const MAX_BUCKETS = 20_000

export function rateLimit({ windowMs = 60 * 1000, max = 10, key = 'default' } = {}) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`
    const now = Date.now()
    const bucket = buckets.get(id)
    if (!bucket || bucket.reset < now) {
      // Each distinct caller adds an entry, so a flood of callers is itself a
      // way to exhaust memory. Sweep eagerly once the map gets large rather
      // than waiting for the 5-minute interval below.
      if (buckets.size > MAX_BUCKETS) {
        for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k)
        if (buckets.size > MAX_BUCKETS) buckets.clear()
      }
      buckets.set(id, { count: 1, reset: now + windowMs })
      return next()
    }
    bucket.count += 1
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' })
    }
    next()
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [id, bucket] of buckets) {
    if (bucket.reset < now) buckets.delete(id)
  }
}, 5 * 60 * 1000).unref()

/* ------------------------------------------------------------------ *
 * Misc helpers
 * ------------------------------------------------------------------ */

const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Human-readable repair ticket, e.g. VMS-7K4PQ2. */
export function ticketCode() {
  let code = ''
  for (let i = 0; i < 6; i++) code += TICKET_ALPHABET[crypto.randomInt(0, TICKET_ALPHABET.length)]
  return `VMS-${code}`
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function nowIso() {
  return new Date().toISOString()
}

/** Normalises an Indian mobile number to its last 10 digits. */
export function normalisePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10)
}

export function asInt(value, fallback = 0) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

export function asFloat(value, fallback = 0) {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}
