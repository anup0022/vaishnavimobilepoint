import type { Product } from './api'

/* ------------------------------------------------------------------ *
 * Gallery frames — PLACEHOLDER
 *
 * `products.image_url` holds exactly one photo, so a multi-frame gallery
 * has no data behind it. Rather than invent stock photography, these
 * frames are re-crops of the item's own real photograph plus real
 * photographs of the shop. `isReal` marks which are genuine views of the
 * product, and the UI says so.
 *
 * Replacing this properly means a `product_images` table and an upload
 * field in the CMS — a schema change, not a design change.
 * ------------------------------------------------------------------ */

const COUNTER_SHOTS = ['/shop/shop-04.jpg', '/shop/shop-09.jpg', '/shop/shop-14.jpg', '/shop/shop-18.jpg']

export interface Frame {
  src: string
  label: string
  isReal: boolean
}

/** Unsplash serves through imgix, so the crop can be varied per frame. */
function variant(url: string, extra: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}${extra}`
}

export function galleryFor(product: Product): Frame[] {
  const base = product.image_url
  const counter = COUNTER_SHOTS[product.id % COUNTER_SHOTS.length]

  // An uploaded photo has no CDN transform parameters to vary.
  if (!base.includes('images.unsplash.com')) {
    return [
      { src: base, label: 'Product', isReal: true },
      { src: counter, label: 'At the counter', isReal: true },
    ]
  }

  return [
    { src: base, label: 'Front', isReal: true },
    { src: variant(base, 'crop=edges&w=1000&h=1000&fit=crop'), label: 'Detail', isReal: false },
    { src: variant(base, 'flip=h&w=1000&h=1000&fit=crop'), label: 'Reverse', isReal: false },
    { src: counter, label: 'At the counter', isReal: true },
  ]
}
