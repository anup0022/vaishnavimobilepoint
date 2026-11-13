import type { Product } from './api'
import { hasRealPhoto } from '@/components/ProductPhoto'

/* ------------------------------------------------------------------ *
 * Gallery frames
 *
 * `products.image_url` holds exactly one photo, so the gallery is that photo
 * plus a real photograph of the shop counter. A product whose photo is still
 * the demo seed's stock picture of another device gets a brand-and-model tile
 * in its place (components/ProductPhoto.tsx) instead of re-crops of somebody
 * else's phone dressed up as "Detail" and "Reverse" views.
 *
 * Several genuine views per product would need a `product_images` table and
 * an upload field in the CMS: a schema change, not a design change.
 * ------------------------------------------------------------------ */

const COUNTER_SHOTS = ['/shop/shop-04.jpg', '/shop/shop-09.jpg', '/shop/shop-14.jpg', '/shop/shop-18.jpg']

export interface Frame {
  src: string
  label: string
  isReal: boolean
  /** No photo of this product yet: show the brand-and-model tile. */
  placeholder?: boolean
}

export function galleryFor(product: Product): Frame[] {
  const counter = { src: COUNTER_SHOTS[product.id % COUNTER_SHOTS.length], label: 'At the counter', isReal: true }

  if (!hasRealPhoto(product)) {
    return [{ src: '', label: 'Photo coming soon', isReal: false, placeholder: true }, counter]
  }
  return [{ src: product.image_url, label: 'Product', isReal: true }, counter]
}
