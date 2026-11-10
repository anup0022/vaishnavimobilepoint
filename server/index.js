import express from 'express'
import compression from 'compression'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cookies } from './util.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'
import { robotsTxt, sitemapXml, injectSeo } from './seo.js'
import { db } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PORT = Number.parseInt(process.env.PORT || '8470', 10)
const CLIENT_DIST = path.join(ROOT, 'client', 'dist')
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads')

const app = express()

/*
 * Nothing was compressed before this. The JS bundle went out at 606KB where
 * 177KB would do — 429KB of waste on every first visit, which is about three
 * and a half extra seconds on a 1Mbps mobile connection. For a shop whose
 * customers are on mobile data in Ranchi, this dwarfs any animation tuning.
 */
app.use(compression({
  // Below ~1KB the gzip header costs more than it saves.
  threshold: 1024,
}))

app.disable('x-powered-by')

/*
 * `trust proxy: true` made Express read the client IP out of X-Forwarded-For,
 * a header any caller can set. The rate limiter keys on req.ip, so one extra
 * header bought a fresh allowance on every request — every limit on the site
 * was bypassable.
 *
 * Only trust the header when a proxy is actually in front of us, and then
 * only as many hops as the operator declares. TRUST_PROXY=1 behind one
 * reverse proxy; leave it unset when the container is exposed directly.
 */
const TRUST_PROXY = process.env.TRUST_PROXY
if (TRUST_PROXY && TRUST_PROXY !== 'false') {
  const hops = Number.parseInt(TRUST_PROXY, 10)
  app.set('trust proxy', Number.isNaN(hops) ? TRUST_PROXY : hops)
} else {
  app.set('trust proxy', false)
}

/*
 * Security headers. No helmet — it would be a third runtime dependency for a
 * dozen static strings.
 *
 * The CSP allowlist is exactly what the site loads: Google Fonts for Inter,
 * Unsplash for catalogue photography, a Google Maps embed on the contact
 * and home pages, and the homepage hero's clip and poster frame. Everything
 * else is same-origin.
 */

/* The hero's CloudFront folder — must match the URLs at the top of
   client/src/components/HomeHero.tsx. Scoped to the folder rather than the
   host, because the host is a shared upload bucket. Without it the video
   falls back to default-src and the hero renders as an empty frame. */
const HERO_MEDIA = 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Framer Motion animates through inline style attributes, so this cannot be
  // dropped without rewriting the animation layer.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: https://images.unsplash.com https://i.pravatar.cc ${HERO_MEDIA}`,
  `media-src 'self' ${HERO_MEDIA}`,
  "connect-src 'self'",
  "frame-src https://maps.google.com https://www.google.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  // Only meaningful over TLS; setting it on plain http would be a lie.
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }
  // Nothing the API returns should sit in a shared cache.
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
  next()
})
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookies)

// Terse request log — handy while running the shop site locally.
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`${new Date().toISOString().slice(11, 19)}  ${req.method} ${req.originalUrl}`)
  }
  next()
})

app.use('/api', publicRouter)
app.use('/api/admin', adminRouter)

/*
 * Belt and braces for the uploads directory: even if something non-image ever
 * lands here, it must not be served as active content on this origin.
 */
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '7d',
    dotfiles: 'ignore',
    index: false,
    setHeaders: (res, filePath) => {
      const ok = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(filePath)
      if (!ok) {
        // Not an image: hand it back as an inert download, never as HTML or JS.
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Disposition', 'attachment')
      }
      res.setHeader('X-Content-Type-Options', 'nosniff')
    },
  }),
)

// Anything under /api that got this far does not exist. Answer with JSON
// rather than falling through to the SPA's index.html.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint.' }))

// Local-search files, generated from the CMS settings.
app.get('/robots.txt', (req, res) => res.type('text/plain').send(robotsTxt(req)))

app.get('/sitemap.xml', (req, res) => {
  const products = db.prepare('SELECT slug FROM products WHERE active = 1').all()
  res.type('application/xml').send(sitemapXml(req, products))
})

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }))

  // The shell is read once and then stamped per-request with the canonical URL
  // and the shop's LocalBusiness markup.
  const shell = fs.readFileSync(path.join(CLIENT_DIST, 'index.html'), 'utf8')
  app.get('*', (req, res) => res.type('html').send(injectSeo(shell, req)))
} else {
  app.get('*', (_req, res) =>
    res
      .status(503)
      .type('html')
      .send('<h1>Client not built</h1><p>Run <code>npm run build:client</code>, or start the stack with <code>docker compose up --build</code>.</p>'),
  )
}

// Multer and body-parser errors arrive here; return JSON the UI can show.
app.use((err, _req, res, _next) => {
  console.error('[error]', err.stack || err.message)
  const status = err.status || err.statusCode || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  // A 4xx message is written for the person filling in the form, so it is safe
  // to show. A 500 is an internal failure whose message can name files,
  // columns or library internals — "URI malformed" was one — so it gets a
  // fixed string instead.
  const safe =
    status < 500 && typeof err.message === 'string'
      ? err.message
      : 'Something went wrong on the server. Please try again.'
  res.status(status).json({ error: safe })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Vaishnavi Mobile Point`)
  console.log(`  Storefront : http://localhost:${PORT}`)
  console.log(`  Staff CMS  : http://localhost:${PORT}/admin`)
  console.log(`  Catalogue  : ${fs.existsSync(CLIENT_DIST) ? 'built' : 'NOT BUILT (API only)'}\n`)
})

// A client that opens a socket and dribbles bytes holds it for Node's default
// five minutes. These caps are generous for a form post and short enough that
// idle sockets cannot pile up.
server.headersTimeout = 20_000
server.requestTimeout = 30_000
server.keepAliveTimeout = 10_000

/*
 * Render and `docker stop` ask the process to stop with SIGTERM. As PID 1 in
 * the container, Node ignores that signal unless it is handled, so every stop
 * waited out the grace period and ended in a SIGKILL — and with a persistent
 * disk attached, that wait is downtime on every deploy. Finish in-flight
 * requests, close the database cleanly, and go; a client that will not let
 * go gets five seconds.
 */
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    server.close(() => {
      db.close()
      process.exit(0)
    })
    setTimeout(() => process.exit(0), 5_000).unref()
  })
}
