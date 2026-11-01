/**
 * Screenshot harness for the design exploration.
 *
 * Deliberately isolated from the app: it uses playwright-core installed under
 * design/.tools and drives the Google Chrome already on this machine, so the
 * site's own package.json and lockfile are never touched.
 *
 *   node design/capture.mjs baseline
 *   node design/capture.mjs baseline http://localhost:8470
 */
import { chromium } from './.tools/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const label = process.argv[2] || 'baseline'
const base = process.argv[3] || 'http://localhost:8470'
const outDir = path.resolve(import.meta.dirname, label)

const ROUTES = [
  ['home', '/'],
  ['products', '/products'],
  ['product-detail', '/products/samsung-galaxy-s24-ultra-5g'],
  ['services', '/services'],
  ['book', '/book'],
  ['track', '/track'],
  ['feedback', '/feedback'],
  ['contact', '/contact'],
  ['about', '/about'],
  ['faq', '/faq'],
]

const VIEWPORTS = [
  ['desktop', 1440, 900],
  ['tablet', 834, 1112],
  ['mobile', 390, 844],
]

const consoleErrors = []

/** Lazy-loaded images only decode once scrolled past, so walk the page first. */
async function settle(page) {
  await page.waitForTimeout(1400)
  await page.evaluate(async () => {
    const step = 600
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 110))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(900)
}

const browser = await chromium.launch({ executablePath: CHROME })
fs.mkdirSync(outDir, { recursive: true })

for (const [device, width, height] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: device === 'mobile',
    hasTouch: device !== 'desktop',
  })
  const page = await context.newPage()

  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[${device}] ${page.url()} :: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleErrors.push(`[${device}] ${page.url()} :: ${e.message}`))

  for (const [name, route] of ROUTES) {
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45_000 })
    await settle(page)
    await page.screenshot({ path: path.join(outDir, `${device}-${name}.png`), fullPage: true })
    const w = await page.evaluate(() => window.innerWidth)
    console.log(`${device}-${name}  (rendered at ${w}px)`)
  }

  await context.close()
}

await browser.close()

fs.writeFileSync(
  path.join(outDir, 'console-errors.txt'),
  consoleErrors.length ? consoleErrors.join('\n') : 'No console errors or page errors recorded.\n',
)
console.log(`\nConsole errors: ${consoleErrors.length}`)
console.log(`Written to ${outDir}`)
