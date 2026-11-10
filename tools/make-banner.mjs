/**
 * Builds the site's banner images from the shop's own photographs.
 *
 *   node tools/make-banner.mjs
 *
 * The source is a phone snapshot of the storefront: flat, hazy, and framed
 * with clutter either side. This crops to the signboard, grades the colour,
 * and composites a designed overlay so it reads as a deliberate banner
 * rather than a snapshot dropped on the page.
 *
 * sharp is a devDependency — the Docker runtime image never installs it.
 */
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const SRC = 'tools/banner-src/storefront-hi.jpg'
const OUT_DIR = 'client/public/shop'

/* The signboard sits at x 320-1370, y 235-470 in the 1728x895 original.
   The window stops at x=1410 so the electrical pole, wires and satellite dish
   are out of frame, and starts at y=224 so the neighbouring shops' signs are
   cropped away rather than sliced through. Ratio matches the output. */
const CROP = { left: 295, top: 224, width: 1115, height: 488 }

const BRAND = {
  violet: '#7c3aed',
  cyan: '#22d3ee',
  ink: '#05060f',
}

/** A font stack that resolves on macOS, Linux CI and inside containers. */
const FONT = "'Avenir Next','Helvetica Neue',Helvetica,'DejaVu Sans',Arial,sans-serif"

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])
}

/**
 * The designed layer: a scrim that darkens the lower-left so type stays
 * readable over a busy photo, a vignette, the text block and a brand bar.
 */
function overlaySvg({ width, height, eyebrow, headline, sub, phone, scale = 1 }) {
  const pad = Math.round(72 * scale)
  const baseline = height - Math.round(68 * scale)

  const sizeEyebrow = Math.round(21 * scale)
  const sizeHead = Math.round(62 * scale)
  const sizeSub = Math.round(25 * scale)
  const sizePhone = Math.round(29 * scale)
  const barH = Math.max(5, Math.round(7 * scale))

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%"   stop-color="${BRAND.ink}" stop-opacity="0.95"/>
      <stop offset="38%"  stop-color="${BRAND.ink}" stop-opacity="0.72"/>
      <stop offset="72%"  stop-color="${BRAND.ink}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${BRAND.ink}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sideScrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${BRAND.ink}" stop-opacity="0.52"/>
      <stop offset="32%"  stop-color="${BRAND.ink}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${BRAND.ink}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${BRAND.violet}"/>
      <stop offset="55%"  stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="${BRAND.cyan}"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.78">
      <stop offset="55%"  stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.42"/>
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  <rect width="${width}" height="${height}" fill="url(#sideScrim)"/>
  <rect width="${width}" height="${height}" fill="url(#scrim)"/>

  <g font-family="${FONT}" fill="#ffffff">
    <text x="${pad}" y="${baseline - Math.round(132 * scale)}"
          font-size="${sizeEyebrow}" font-weight="700" letter-spacing="${3.4 * scale}"
          fill="${BRAND.cyan}" opacity="0.95">${escapeXml(eyebrow)}</text>

    <text x="${pad}" y="${baseline - Math.round(62 * scale)}"
          font-size="${sizeHead}" font-weight="700" letter-spacing="${-1.2 * scale}">${escapeXml(headline)}</text>

    <text x="${pad}" y="${baseline - Math.round(22 * scale)}"
          font-size="${sizeSub}" font-weight="500" opacity="0.88">${escapeXml(sub)}</text>

    <text x="${pad}" y="${baseline + Math.round(20 * scale)}"
          font-size="${sizePhone}" font-weight="700" fill="${BRAND.cyan}">${escapeXml(phone)}</text>
  </g>

  <rect x="0" y="${height - barH}" width="${width}" height="${barH}" fill="url(#accent)"/>
</svg>`)
}

/** Crop, grade, resize — the photographic half of the job. */
function graded() {
  return sharp(SRC)
    .extract(CROP)
    // Lift the flat midtones, warm it slightly, and bring up the colour that
    // the original's haze washed out.
    .modulate({ saturation: 1.22, brightness: 1.045 })
    .linear(1.1, -11)
    .gamma(1.06)
}

async function build({ name, width, height, scale, text }) {
  const base = await graded()
    .resize(width, height, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 0.6, m2: 2.2 })
    .toBuffer()

  const out = path.join(OUT_DIR, name)
  await sharp(base)
    .composite([{ input: overlaySvg({ width, height, scale, ...text }), blend: 'over' }])
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(out)

  const { size } = await fs.stat(out)
  const meta = await sharp(out).metadata()
  console.log(`  ${name.padEnd(22)} ${meta.width}x${meta.height}  ${(size / 1024).toFixed(0)}KB`)
}

const TEXT = {
  eyebrow: 'RATU ROAD, RANCHI  ·  SINCE 2005',
  headline: 'Sales. Repairs. Accessories.',
  sub: 'Same-day screen & battery replacement · Genuine parts · Written warranty',
  phone: '+91 91222 66808',
}

console.log('Building banners from the shop photograph:')

// Wide hero band for the top of the site.
await build({ name: 'banner-hero.jpg', width: 1600, height: 700, scale: 0.9, text: TEXT })

// Social / WhatsApp preview card (og:image is 1200x630).
await build({ name: 'banner-social.jpg', width: 1200, height: 630, scale: 0.82, text: TEXT })

/* The hero keeps its 4:3 frame, so it gets its own crop of the same photo —
   graded the same way, but without the overlay, since the hero already
   carries its own headline. */
await sharp(SRC)
  .extract({ left: 348, top: 150, width: 993, height: 745 })
  .modulate({ saturation: 1.22, brightness: 1.045 })
  .linear(1.1, -11)
  .gamma(1.06)
  .resize(1200, 900, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
  .sharpen({ sigma: 0.8, m1: 0.6, m2: 2.2 })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(path.join(OUT_DIR, 'storefront-graded.jpg'))
console.log('  storefront-graded.jpg  1200x900  (4:3 graded, for the hero)')

// A plain graded crop with no text, for use behind other content.
await sharp(await graded().resize(1600, 700, { fit: 'cover', position: 'centre', kernel: 'lanczos3' }).sharpen({ sigma: 0.8 }).toBuffer())
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(OUT_DIR, 'banner-plain.jpg'))
console.log('  banner-plain.jpg       (graded crop, no overlay)')

console.log('Done.')
