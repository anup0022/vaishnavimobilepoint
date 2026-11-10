/**
 * Interaction smoke test for the storefront. Complements tools/verify.sh,
 * which covers the API — this drives the parts of the UI a customer uses.
 *
 *   node design/smoke-ui.mjs [baseUrl]
 */
import { chromium } from './.tools/node_modules/playwright-core/index.mjs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const base = process.argv[2] || 'http://localhost:8470'

let pass = 0
let fail = 0
const problems = []

function check(name, ok, detail = '') {
  if (ok) {
    pass++
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  } else {
    fail++
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? `\n     ${detail}` : ''}`)
  }
}

const browser = await chromium.launch({ executablePath: CHROME })

for (const [device, width, height, isMobile] of [
  ['desktop', 1440, 900, false],
  ['mobile', 390, 844, true],
]) {
  console.log(`\n\x1b[1m${device} ${width}x${height}\x1b[0m`)
  const context = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile })
  const page = await context.newPage()
  page.on('console', (m) => m.type() === 'error' && problems.push(`[${device}] ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`[${device}] ${e.message}`))

  /* ----------------------------- catalogue ---------------------------- */
  await page.goto(`${base}/products`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const allCount = await page.locator('a[href^="/products/"]').count()
  check('catalogue lists products', allCount > 0, `found ${allCount}`)

  await page.fill('input[aria-label="Search products"]', 'iphone')
  await page.waitForTimeout(1400)
  const searched = await page.locator('a[href^="/products/"]').count()
  check('search narrows the grid', searched > 0 && searched < allCount, `${allCount} -> ${searched}`)
  check('search is reflected in the URL', page.url().includes('q=iphone'), page.url())

  await page.fill('input[aria-label="Search products"]', '')
  await page.waitForTimeout(1400)

  if (device === 'mobile') {
    await page.getByRole('button', { name: /filters/i }).click()
    await page.waitForTimeout(400)
  }
  await page.getByRole('button', { name: /^Audio/ }).first().click()
  await page.waitForTimeout(1200)
  const filtered = await page.locator('a[href^="/products/"]').count()
  check('category filter applies', filtered > 0 && filtered < allCount, `${allCount} -> ${filtered}`)
  check('filter is reflected in the URL', page.url().includes('category=audio'), page.url())

  /* ---------------------------- detail page --------------------------- */
  await page.goto(`${base}/products/samsung-galaxy-s24-ultra-5g`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  check('detail shows the price', await page.getByText('₹1,29,999').first().isVisible())

  const gallery = page.locator('[role="group"][aria-label*="frame"]')
  check('orbit gallery is present', (await gallery.count()) === 1)
  const before = await gallery.getAttribute('aria-label')
  await page.getByRole('button', { name: 'Next frame' }).click()
  await page.waitForTimeout(500)
  const after = await gallery.getAttribute('aria-label')
  check('gallery advances a frame', before !== after, `${before} -> ${after}`)

  const tel = await page.locator('a[href^="tel:"]').count()
  const wa = await page.locator('a[href*="wa.me"]').count()
  check('reserve actions intact (call + whatsapp)', tel > 0 && wa > 0, `tel=${tel} wa=${wa}`)

  /* -------------------------- booking wizard -------------------------- */
  await page.goto(`${base}/book`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.fill('input[name="name"], #name', 'Test Customer').catch(() => {})
  const nameBox = page.locator('input').first()
  await nameBox.fill('Test Customer')
  await page.locator('input[inputmode="numeric"], input[type="tel"]').first().fill('9122266808')
  await page.waitForTimeout(300)
  const next = page.getByRole('button', { name: /continue|next/i }).first()
  const canAdvance = await next.isEnabled().catch(() => false)
  check('step 1 validates and enables continue', canAdvance)
  if (canAdvance) {
    await next.click()
    await page.waitForTimeout(700)
    check('wizard advances to step 2', await page.getByText(/device/i).first().isVisible())
  }

  /* ------------------------------ tracking ---------------------------- */
  await page.goto(`${base}/track`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  check('tracking still requires a CAPTCHA', (await page.locator('svg, img[alt*="security" i]').count()) > 0)

  /* -------------------------------- nav ------------------------------- */
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.waitForTimeout(600)
  check('menu opens with every link', (await page.locator('nav a, ul a').count()) >= 8)
  await page.getByRole('button', { name: 'Close menu' }).click()
  await page.waitForTimeout(500)

  /* ------------------------------ teardown ---------------------------- */
  const layers = await page.locator('[data-layer]').count()
  check('teardown renders its three layers', layers === 3, `found ${layers}`)
  const railsVisible = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-callout-rail]')).every(
      (el) => getComputedStyle(el).opacity !== '0',
    ),
  )
  check('service callouts are never hidden by a trigger', railsVisible)

  await context.close()
}

/* ------------------------- reduced motion ---------------------------- */
console.log('\n\x1b[1mprefers-reduced-motion: reduce\x1b[0m')
const calm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
const calmPage = await calm.newPage()
calmPage.on('pageerror', (e) => problems.push(`[reduced-motion] ${e.message}`))
await calmPage.goto(base, { waitUntil: 'networkidle' })
await calmPage.waitForTimeout(2000)
const calmProbe = await calmPage.evaluate(() => ({
  text: (document.body.innerText || '').replace(/\s+/g, ' ').trim().length,
  // A lazy image that has not decoded yet is a loading state, not stranded
  // content — SmartImage holds a shimmer behind it and fades it in on load.
  hidden: Array.from(document.querySelectorAll('section *')).filter((el) => {
    if (getComputedStyle(el).opacity !== '0') return false
    if (el.getBoundingClientRect().height === 0) return false
    return !(el instanceof HTMLImageElement && !el.complete)
  }).length,
  // GSAP must not even be fetched when motion is off.
  gsapLoaded: performance.getEntriesByType('resource').some((r) => r.name.includes('gsap')),
}))
check('page is fully readable with motion off', calmProbe.text > 1500, `${calmProbe.text} chars`)
check('nothing is stranded at opacity 0', calmProbe.hidden === 0, `${calmProbe.hidden} hidden`)
check('GSAP is not downloaded when motion is off', !calmProbe.gsapLoaded)
await calm.close()

await browser.close()

console.log(`\n${pass} passed, ${fail} failed`)
if (problems.length) {
  console.log(`\nConsole/page errors (${problems.length}):`)
  console.log(problems.slice(0, 10).join('\n'))
}
process.exit(fail || problems.length ? 1 : 0)
