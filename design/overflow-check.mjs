/**
 * Checks for horizontal overflow at mobile width and names the offending
 * elements. `body { overflow-x: hidden }` hides the symptom, so the only way
 * to see this is to measure element rects against the viewport.
 *
 *   node design/overflow-check.mjs
 */
import { chromium } from './.tools/node_modules/playwright-core/index.mjs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const base = process.argv[2] || 'http://localhost:8470'
const ROUTES = ['/', '/products', '/products/samsung-galaxy-s24-ultra-5g', '/services', '/book', '/track', '/feedback', '/contact', '/about', '/faq']

const browser = await chromium.launch({ executablePath: CHROME })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()

for (const route of ROUTES) {
  await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45_000 })
  await page.waitForTimeout(1600)

  const report = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const offenders = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // .full-bleed is 100vw by design and is clipped by body; ignore it.
      if (el.classList.contains('full-bleed')) continue
      if (r.right > vw + 1 || r.left < -1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 70),
          left: Math.round(r.left),
          right: Math.round(r.right),
        })
      }
    }
    return {
      vw,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: offenders.slice(0, 6),
      total: offenders.length,
    }
  })

  const flag = report.innerWidth > report.vw + 1 || report.total > 0 ? 'OVERFLOW' : 'ok'
  console.log(`\n${route}  [${flag}]  clientWidth=${report.vw} innerWidth=${report.innerWidth} scrollWidth=${report.scrollWidth} offenders=${report.total}`)
  for (const o of report.offenders) {
    console.log(`    <${o.tag} class="${o.cls}">  left=${o.left} right=${o.right}`)
  }
}

await browser.close()
