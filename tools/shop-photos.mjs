/*
 * Makes smaller copies of the shop's own photographs, so a phone downloads
 * a size that fits the screen instead of the full camera file — the home
 * gallery was fetching 250–360 KB per photo for 152px squares, which on a
 * mobile connection left the tiles empty for two seconds or more.
 *
 *   node tools/shop-photos.mjs
 *
 * For each shop photo (shop-NN.jpg) and the catalogue banner it writes
 * <name>-480.jpg, -640.jpg and -960.jpg — only widths smaller than the original —
 * and records what exists in client/src/lib/shopPhotos.json, which
 * lib/images.ts reads to build each photo's srcset. The social-card banners
 * are left alone: only link previews use them, at their full size.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const sharp = createRequire(import.meta.url)('sharp')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'client/public/shop')
const MANIFEST = path.join(ROOT, 'client/src/lib/shopPhotos.json')
const WIDTHS = [480, 640, 960]

const manifest = {}
const sources = fs
  .readdirSync(DIR)
  .filter((f) => /^shop-\d+\.jpg$/.test(f) || f === 'banner-wide.jpg')
  .sort()

for (const file of sources) {
  const name = file.replace(/\.jpg$/, '')
  const input = path.join(DIR, file)
  const { width, height } = await sharp(input).metadata()
  const made = []
  for (const w of WIDTHS) {
    if (w >= width) continue
    await sharp(input)
      .rotate()
      .resize({ width: w })
      .jpeg({ quality: 74, progressive: true, mozjpeg: true })
      .toFile(path.join(DIR, `${name}-${w}.jpg`))
    made.push(w)
  }
  manifest[name] = { width, height, copies: made }
  console.log(`${file.padEnd(26)} ${width}x${height}  ->  ${made.map((w) => `${w}w`).join(', ') || '(already small)'}`)
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log(`\n${Object.keys(manifest).length} photos, manifest written to ${path.relative(ROOT, MANIFEST)}`)
