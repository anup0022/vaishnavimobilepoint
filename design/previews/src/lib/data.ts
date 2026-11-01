import { useEffect, useState } from 'react'

export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface Product {
  id: number
  sku: string
  slug: string
  name: string
  brand: string
  category: string
  description: string
  price: number
  mrp: number
  discount: number
  image_url: string
  specs: string[]
  featured: boolean
  availability: Availability
}

export interface Review {
  id: number
  name: string
  city: string
  rating: number
  title: string
  message: string
  avatar_url: string
  created_at: string
}

export interface Facets {
  categories: { category: string; n: number }[]
  brands: { brand: string; n: number }[]
}

export type Settings = Record<string, string>

export interface Stats {
  products: number
  brands: number
  reviews: number
  rating: number
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json() as Promise<T>
}

export interface ShopData {
  products: Product[]
  facets: Facets
  reviews: Review[]
  settings: Settings
  stats: Stats | null
  loading: boolean
  error: string
}

/** Everything the previews need, from the running shop on :8470. */
export function useShopData(): ShopData {
  const [data, setData] = useState<ShopData>({
    products: [],
    facets: { categories: [], brands: [] },
    reviews: [],
    settings: {},
    stats: null,
    loading: true,
    error: '',
  })

  useEffect(() => {
    let alive = true
    Promise.all([
      get<{ products: Product[]; facets: Facets }>('/api/products'),
      get<{ reviews: Review[] }>('/api/feedback'),
      get<Settings>('/api/settings'),
      get<Stats>('/api/stats'),
    ])
      .then(([cat, fb, settings, stats]) => {
        if (!alive) return
        setData({
          products: cat.products,
          facets: cat.facets,
          reviews: fb.reviews,
          settings,
          stats,
          loading: false,
          error: '',
        })
      })
      .catch((e: Error) => {
        if (!alive) return
        setData((d) => ({ ...d, loading: false, error: e.message }))
      })
    return () => {
      alive = false
    }
  }, [])

  return data
}

/* ------------------------------------------------------------------ *
 * Gallery frames — PLACEHOLDER
 *
 * products.image_url holds exactly one photo, so a multi-frame gallery
 * has no data behind it yet. Rather than invent products, these frames
 * are re-crops of the item's own real photograph plus real photographs
 * of the shop. Every frame is labelled, and isReal marks which ones are
 * genuine views of that product.
 *
 * Replacing this means adding a product_images table — a schema change,
 * not a design change.
 * ------------------------------------------------------------------ */

const SHOP_PHOTOS = ['/shop/shop-04.jpg', '/shop/shop-09.jpg', '/shop/shop-14.jpg', '/shop/shop-18.jpg']

export interface Frame {
  src: string
  label: string
  isReal: boolean
}

function variant(url: string, extra: string): string {
  if (!url.includes('images.unsplash.com')) return url
  return `${url}${url.includes('?') ? '&' : '?'}${extra}`
}

export function galleryFor(product: Product): Frame[] {
  const base = product.image_url
  const counterShot = SHOP_PHOTOS[product.id % SHOP_PHOTOS.length]

  if (!base.includes('images.unsplash.com')) {
    return [
      { src: base, label: 'Product', isReal: true },
      { src: counterShot, label: 'At the counter', isReal: true },
    ]
  }

  return [
    { src: base, label: 'Front', isReal: true },
    { src: variant(base, 'crop=edges&w=1000&h=1000&fit=crop'), label: 'Detail', isReal: false },
    { src: variant(base, 'flip=h&w=1000&h=1000&fit=crop'), label: 'Reverse', isReal: false },
    { src: counterShot, label: 'At the counter', isReal: true },
  ]
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function money(value: number): string {
  return inr.format(Number.isFinite(value) ? value : 0)
}

export const CATEGORY_LABELS: Record<string, string> = {
  smartphone: 'Smartphones',
  tablet: 'Tablets',
  wearable: 'Smartwatches',
  audio: 'Audio',
  accessory: 'Accessories',
}

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: 'In stock',
  low_stock: 'Only a few left',
  out_of_stock: 'Out of stock',
}

/** "10:00 AM – 9:00 PM" -> minutes past midnight, or null. */
function parseHours(range: string): [number, number] | null {
  const m = range?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–\-—to]+\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!m) return null
  const to24 = (h: string, mer: string) => {
    let n = Number(h) % 12
    if (mer.toUpperCase() === 'PM') n += 12
    return n
  }
  return [to24(m[1], m[3]) * 60 + Number(m[2]), to24(m[4], m[6]) * 60 + Number(m[5])]
}

export function openNow(settings: Settings, now = new Date()): { open: boolean; label: string } {
  const sunday = now.getDay() === 0
  const range = sunday ? settings.hours_sunday : settings.hours_weekday
  const parsed = parseHours(range || '')
  if (!parsed) return { open: true, label: range || '' }

  const mins = now.getHours() * 60 + now.getMinutes()
  const open = mins >= parsed[0] && mins < parsed[1]
  const closeLabel = range.split(/[–\-—]/)[1]?.trim() ?? ''
  return { open, label: open ? `Closes ${closeLabel}` : `Opens ${range.split(/[–\-—]/)[0]?.trim()}` }
}

export function useReducedMotion(): boolean {
  const [calm, setCalm] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setCalm(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return calm
}

export const EASE = [0.22, 1, 0.36, 1] as const

/** Stagger that cannot outgrow the reader's patience. */
export function stagger(index: number, step = 0.045, cap = 0.3): number {
  return Math.min(index * step, cap)
}
