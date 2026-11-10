import shopPhotos from './shopPhotos.json'

/* ------------------------------------------------------------------ *
 * Responsive images.
 *
 * A phone has two or three device pixels for every CSS pixel, and most
 * photos on this site are shown cropped (object-fit: cover) into a shape
 * different from the photo's own. One landscape file stretched to fill a
 * square tile or the tall phone hero came out blurred on a real handset —
 * up to 2.3x past its resolution — while looking fine on a laptop. And one
 * full-size camera file per small tile kept phones on mobile data waiting.
 *
 * So each photo is offered in several widths, already cropped to the
 * shape it is shown in where the image host can crop, and the browser picks
 * the one its screen needs (`sizes` tells it how wide the slot is).
 * ------------------------------------------------------------------ */

export interface ImageSet {
  src: string
  srcSet?: string
}

type ShopManifest = Record<string, { width: number; height: number; copies: number[] }>

const UNSPLASH = 'https://images.unsplash.com/'

/**
 * An Unsplash photo (served through imgix) cropped to `aspect` (width ÷
 * height) at each of `widths`. Anything else is returned as it is.
 */
export function cropped(url: string, aspect: number, widths: number[], quality = 75): ImageSet {
  if (!url?.startsWith(UNSPLASH)) return { src: url }
  const at = (w: number) => {
    const u = new URL(url)
    u.searchParams.set('auto', 'format')
    u.searchParams.set('fit', 'crop')
    u.searchParams.set('w', String(w))
    u.searchParams.set('h', String(Math.round(w / aspect)))
    u.searchParams.set('q', String(quality))
    return u.toString()
  }
  return {
    src: at(widths[Math.min(1, widths.length - 1)]),
    srcSet: widths.map((w) => `${at(w)} ${w}w`).join(', '),
  }
}

/**
 * One of the shop's own photographs (/shop/shop-05.jpg) with the smaller
 * copies `tools/shop-photos.mjs` made of it, plus the original as the
 * largest choice. Unknown paths are returned as they are.
 */
export function shopPhoto(path: string): ImageSet {
  const name = path.match(/^\/shop\/([\w-]+)\.jpg$/)?.[1]
  const info = name ? (shopPhotos as ShopManifest)[name] : undefined
  if (!name || !info) return { src: path }
  const copies = info.copies.map((w) => `/shop/${name}-${w}.jpg ${w}w`)
  return {
    src: info.copies.includes(960) ? `/shop/${name}-960.jpg` : path,
    srcSet: [...copies, `${path} ${info.width}w`].join(', '),
  }
}

/** Whichever of the two applies: a crop for Unsplash, the copies for a shop photo. */
export function responsive(url: string, aspect: number, widths: number[]): ImageSet {
  if (url?.startsWith(UNSPLASH)) return cropped(url, aspect, widths)
  if (url?.startsWith('/shop/')) return shopPhoto(url)
  return { src: url }
}

/** Widths offered for square product tiles — a 360px tile on a 3x phone needs ~1080. */
export const SQUARE_WIDTHS = [320, 480, 720, 960, 1200]

/** The avatar service sizes by path; ask for enough pixels for a 3x screen. */
export function avatar(url: string, cssPx: number): string {
  if (!url?.startsWith('https://i.pravatar.cc/')) return url
  return url.replace(/^https:\/\/i\.pravatar\.cc\/\d+/, `https://i.pravatar.cc/${cssPx * 3}`)
}
