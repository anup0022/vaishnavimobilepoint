/**
 * Renders every concept at desktop and mobile, records console/page errors and
 * writes screenshots to design/concepts/.
 *
 *   node design/capture-previews.mjs [baseUrl]
 */
import { chromium } from './.tools/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const base = process.argv[2] || 'http://localhost:5290'
const outDir = path.resolve(import.meta.dirname, 'concepts')

const ROUTES = [
  ['compare', '/'],
  ['counter', '/counter?bare=1'],
  ['bench', '/bench?bare=1'],
  ['dukaan', '/dukaan?bare=1'],
]
const VIEWPORTS = [
  ['desktop', 1440, 900, false],
  ['mobile', 390, 844, true],
]

const problems = []
fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME })

for (const [device, width, height, isMobile] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
  })
  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[${device}] ${page.url()} :: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`[${device}] ${page.url()} :: ${e.message}`))

  for (const [name, route] of ROUTES) {
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1500)
    await page.evaluate(async () => {
      const step = 700
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 150))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(900)
    await page.screenshot({ path: path.join(outDir, `${device}-${name}.png`), fullPage: true })

    const probe = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth

      // An element sticking past the viewport is only a defect if nothing
      // between it and the root clips or scrolls. Decorative blurs inside an
      // overflow-hidden section, and chips inside a horizontal scroller, are
      // both correct and would otherwise drown the real findings.
      const isClipped = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p)
          if (o.overflowX !== 'visible' || o.overflowY !== 'visible') return true
        }
        return false
      }

      const offenders = []
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.right <= vw + 1 && r.left >= -1) continue
        if (isClipped(el)) continue
        offenders.push(
          `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}"> ${Math.round(r.left)}..${Math.round(r.right)}`,
        )
      }

      return {
        w: window.innerWidth,
        scrollW: document.documentElement.scrollWidth,
        h: document.documentElement.scrollHeight,
        // A concept that rendered nothing would still screenshot as a blank page.
        text: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
        imgs: document.querySelectorAll('img').length,
        offenders: offenders.slice(0, 4),
        offenderCount: offenders.length,
      }
    })
    const overflow = probe.scrollW > probe.w + 1 ? `  OVERFLOW ${probe.scrollW}` : ''
    console.log(`${device}-${name}  ${probe.w}px  height=${probe.h}  text=${probe.text}  imgs=${probe.imgs}${overflow}`)
    if (probe.offenderCount) {
      console.log(`    ${probe.offenderCount} unclipped element(s) past the viewport:`)
      for (const o of probe.offenders) console.log(`      ${o}`)
    }
  }
  await context.close()
}

await browser.close()
fs.writeFileSync(
  path.join(outDir, 'console-errors.txt'),
  problems.length ? problems.join('\n') : 'No console errors or page errors recorded.\n',
)
console.log(`\nProblems: ${problems.length}`)
if (problems.length) console.log(problems.slice(0, 15).join('\n'))
