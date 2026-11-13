import express from 'express'
import compression from 'compression'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cookies } from './util.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'
import { robotsTxt, sitemapXml, renderPage, trimTrailingSlashes, ANALYTICS_ID } from './seo.js'
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
 * The CSP allowlist is exactly what the site loads: Google Fonts, Unsplash
 * for catalogue and homepage photography, review avatars, and a Google Maps
 * embed on the contact page. Everything else is same-origin.
 */

/* Google Analytics 4 (gtag.js), only once GA_MEASUREMENT_ID is set — the
   hosts Google lists for a CSP with the Google tag. Until then the policy is
   exactly what it was. */
const GA = ANALYTICS_ID
  ? {
      script: ' https://*.googletagmanager.com',
      img: ' https://*.google-analytics.com https://*.googletagmanager.com',
      connect: ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com',
    }
  : { script: '', img: '', connect: '' }

const CSP = [
  "default-src 'self'",
  `script-src 'self'${GA.script}`,
  // Framer Motion animates through inline style attributes, so this cannot be
  // dropped without rewriting the animation layer.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: https://images.unsplash.com https://i.pravatar.cc${GA.img}`,
  `connect-src 'self'${GA.connect}`,
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
  if (req.path.startsWith('/api')) {
    // Nothing the API returns should sit in a shared cache.
    res.setHeader('Cache-Control', 'no-store')
    // Crawlable, because pages render from it (see robotsTxt in seo.js),
    // but never a search result in its own right.
    res.setHeader('X-Robots-Tag', 'noindex')
  }
  // Developer demos that ship in client/public: reachable, never indexed.
  if (req.path.startsWith('/demos/')) res.setHeader('X-Robots-Tag', 'noindex')
  next()
})

/*
 * One address per page. "/products/" and "/products" served the same page,
 * and "/index.html" served the shell before it was stamped with a title or
 * canonical. Each now redirects permanently to the address the sitemap and
 * the canonical tags use. GET and HEAD only, so no form post is redirected.
 */
const SITE_ORIGIN = (process.env.SITE_URL || '').trim().replace(/\/+$/, '')
const SITE_HOSTNAME = (() => {
  try {
    return SITE_ORIGIN ? new URL(SITE_ORIGIN).hostname : ''
  } catch {
    return ''
  }
})()

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  // The API, and with it Render's health check, answers on any host.
  if (req.path.startsWith('/api')) return next()
  // Render serves the site at its *.onrender.com address too: a complete
  // second copy of every page. Send it to the real domain.
  if (SITE_HOSTNAME && req.hostname !== SITE_HOSTNAME && req.hostname?.endsWith('.onrender.com')) {
    return res.redirect(301, `${SITE_ORIGIN}${req.originalUrl}`)
  }
  const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''
  if (req.path === '/index.html') return res.redirect(301, `/${query}`)
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const target = trimTrailingSlashes(req.path)
    // Only ordinary paths, one slash between plain segments. "//example.com/"
    // or "/\example.com/" must never become a Location a browser reads as
    // another site; those fall through to the 404 page instead.
    if (/^(\/[\w.~%-]+)+$/.test(target)) return res.redirect(301, `${target}${query}`)
  }
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
    // No "/uploads" -> "/uploads/" directory redirect: the trailing-slash
    // redirect above would send it straight back, forever.
    redirect: false,
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

/*
 * New uploads are stored in the database (so the backup that protects
 * bookings protects them too); photos from before that are still served from
 * the folder above. Only sniffed image types are ever stored, and names are
 * random and never reused, so they can be cached for a long time.
 */
app.get('/uploads/:name', (req, res) => {
  const row = db.prepare('SELECT mime, data FROM uploads WHERE name = ?').get(req.params.name)
  if (!row) return res.status(404).type('text/plain').send('Not found')
  res.setHeader('Content-Type', row.mime)
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.send(Buffer.from(row.data))
})

// Anything under /api that got this far does not exist. Answer with JSON
// rather than falling through to the SPA's index.html.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint.' }))

// Local-search files, generated from the CMS settings.
app.get('/robots.txt', (req, res) => res.type('text/plain').send(robotsTxt(req)))

// The client build's date stands in for the last change to the static pages.
const SHELL_BUILT = fs.existsSync(path.join(CLIENT_DIST, 'index.html'))
  ? fs.statSync(path.join(CLIENT_DIST, 'index.html')).mtime
  : null

app.get('/sitemap.xml', (req, res) => {
  const products = db.prepare('SELECT slug, updated_at FROM products WHERE active = 1').all()
  const reviewsAt = db.prepare('SELECT MAX(created_at) AS at FROM feedback WHERE approved = 1').get().at
  res.type('application/xml').send(sitemapXml(req, products, { builtAt: SHELL_BUILT, reviewsAt }))
})

if (fs.existsSync(CLIENT_DIST)) {
  app.use(
    express.static(CLIENT_DIST, {
      index: false,
      maxAge: '1h',
      // A directory such as /shop or /assets is not a page: no redirect to
      // "/shop/" (which the trailing-slash rule would bounce back), just 404.
      redirect: false,
      setHeaders: (res, filePath) => {
        // Vite names everything under assets/ by a hash of its contents, so a
        // changed file gets a new name: these can be cached for a year.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )

  // The shell is read once and then stamped per-request with the page's
  // title, canonical URL, structured data and content.
  const shell = fs.readFileSync(path.join(CLIENT_DIST, 'index.html'), 'utf8')
  app.get('*', (req, res) => {
    const page = renderPage(shell, req)
    if (page.noindex) res.setHeader('X-Robots-Tag', 'noindex')
    res.status(page.status).type('html').send(page.html)
  })
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
