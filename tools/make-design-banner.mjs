/**
 * Derivatives of the supplied Vaishnavi Mobile Point banner artwork.
 *
 *   node tools/make-design-banner.mjs      (run from the project root)
 *
 * Unlike make-banner.mjs — which grades a photo and composites text onto it —
 * this one must NOT add or crop anything meaningful: the artwork is already
 * designed, with the shop name, numbers, brand row and address placed
 * deliberately. All we do is trim dead space and produce the sizes the site
 * and the social-card crawlers need.
 *
 * The one exception is the phone numbers. The artwork was supplied with the
 * wrong ones (91222 66800 / 88773 33044), so their digits are painted over
 * with the box's own white and re-set in the same place, height and colour.
 * The source file stays exactly as supplied.
 */
import sharp from 'sharp'
import path from 'node:path'

const SRC = 'tools/banner-src/banner-design.webp'
const OUT_DIR = 'client/public/shop'

/** The shop's numbers, top line first. Keep in step with server/db.js. */
const NUMBERS = ['9122266808', '9304047196']

/*
 * Measured on the source (1448x1086): the white box beside the WhatsApp icon
 * spans x 1129-1418, y 80-167; the two lines of digits are 25px tall, start
 * at x=1214 and sit on baselines y=117 and y=155, in rgb(21,22,45). Arial
 * Bold at 34.5px with -0.9px tracking lands within 1px of the original ink.
 */
const numbersPatch = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1448" height="1086">
  <rect x="1207" y="86" width="198" height="76" fill="rgb(254,254,254)"/>
  <g font-family="Arial,'Helvetica Neue',Helvetica,sans-serif" font-weight="700" font-size="34.5"
     letter-spacing="-0.9" fill="rgb(21,22,45)">
    <text x="1213" y="117">${NUMBERS[0]}</text>
    <text x="1213" y="155">${NUMBERS[1]}</text>
  </g>
</svg>`)

const source = await sharp(SRC).composite([{ input: numbersPatch, left: 0, top: 0 }]).png().toBuffer()

// The artwork is 1448x1086 but the bottom ~96px is empty white below the
// address bar. Everything above y=990 is design.
const CONTENT_H = 990
// The blue poster block ends where the white gap before the brand-logo row
// begins, measured by scanning for near-white rows.
const BLUE_H = 686

const jpg = { quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' }

async function write(name, pipeline) {
  const out = path.join(OUT_DIR, name)
  const info = await pipeline.jpeg(jpg).toFile(out)
  console.log(`  ${name.padEnd(26)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`)
}

const full = () => sharp(source).extract({ left: 0, top: 0, width: 1448, height: CONTENT_H })

console.log('Vaishnavi Mobile Point — banner artwork derivatives\n')

// 1. The complete design: name, tagline, numbers, brand row, address.
await write('banner-design.jpg', full())

// 2. The blue poster block on its own, for a wide strip where the brand row
//    and address bar would make the band too tall.
await write(
  'banner-design-wide.jpg',
  sharp(source).extract({ left: 0, top: 0, width: 1448, height: BLUE_H }),
)

// 3. Social card. 1200x630 is 1.9:1 but the artwork is 1.46:1, so it cannot
//    fill the frame without cropping away the address bar. Instead the design
//    is fitted whole and the side bars are filled with a blurred, zoomed copy
//    of itself — no flat colour to seam against the artwork's own gradient.
const SOCIAL_W = 1200
const SOCIAL_H = 630
const fitted = await full()
  .resize(null, SOCIAL_H, { fit: 'contain' })
  .png()
  .toBuffer()
const backdrop = await full()
  .resize(SOCIAL_W, SOCIAL_H, { fit: 'cover', position: 'centre' })
  .blur(26)
  .modulate({ brightness: 0.82 })
  .png()
  .toBuffer()
await write(
  'banner-design-social.jpg',
  sharp(backdrop).composite([{ input: fitted, gravity: 'centre' }]),
)

console.log('\nDone.')
