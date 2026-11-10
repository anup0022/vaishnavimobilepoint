import { useEffect, useMemo, useState } from 'react'
import { api, type Product, type Review } from '@/lib/api'
import { money } from '@/lib/format'
import { useSettings } from '@/lib/useSettings'
import { cropped } from '@/lib/images'
import HeroSlider, { type HeroSlide } from '@/components/store/HeroSlider'
import CategoryTiles, { type CategoryTile } from '@/components/store/CategoryTiles'
import ProductShowcase from '@/components/store/ProductShowcase'
import PromoBanner from '@/components/store/PromoBanner'
import Testimonials from '@/components/store/Testimonials'
import ShopGallery from '@/components/store/ShopGallery'
import '@/components/store/store.css'

/** Catalogue photography from Unsplash; its CDN crops each size we ask for. */
const unsplash = (id: string) => `https://images.unsplash.com/${id}`

/**
 * A hero photo cropped to the slide's shape on each kind of screen: the
 * phone slide is taller than wide (390×507), the tablet one roughly 5:4,
 * the desktop one about 7:4. Widths run up to what a 3x phone or a 2x
 * laptop screen needs.
 */
function heroImage(id: string) {
  return {
    phone: cropped(unsplash(id), 0.77, [480, 720, 960, 1290], 72),
    tablet: cropped(unsplash(id), 1.25, [800, 1200, 1600, 2048], 72),
    desktop: cropped(unsplash(id), 1.75, [1280, 1600, 1920, 2400, 2880], 72),
  }
}

/** The four categories the tiles lead to, each with a clean product photograph. */
const CATEGORIES = [
  { key: 'smartphone', name: 'Smartphones', photo: 'photo-1703133431079-8477009d42b2' },
  { key: 'audio', name: 'Earbuds & Headphones', photo: 'photo-1583394838336-acd977736f90' },
  { key: 'wearable', name: 'Smartwatches', photo: 'photo-1523275335684-37898b6baf30' },
  { key: 'accessory', name: 'Chargers & Accessories', photo: 'photo-1583863788434-e58a36330cf0' },
]

export default function Home() {
  const settings = useSettings()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [reviews, setReviews] = useState<Review[] | null>(null)

  useEffect(() => {
    api.get<{ products: Product[] }>('/api/products').then((d) => setProducts(d.products)).catch(() => setProducts([]))
    api.get<{ reviews: Review[] }>('/api/feedback').then((d) => setReviews(d.reviews)).catch(() => setReviews([]))
  }, [])

  // Every "from ₹…" and "up to …% off" is worked out from today's catalogue,
  // so the homepage can never advertise a price or saving that isn't there.
  const byCategory = useMemo(() => {
    const out: Record<string, { from: number; maxOff: number }> = {}
    for (const p of products ?? []) {
      const c = (out[p.category] ??= { from: Infinity, maxOff: 0 })
      c.from = Math.min(c.from, p.price)
      c.maxOff = Math.max(c.maxOff, p.discount || 0)
    }
    return out
  }, [products])

  const from = (key: string) => {
    const c = byCategory[key]
    return c && Number.isFinite(c.from) ? `from ${money(c.from)}` : ' '
  }

  const slides: HeroSlide[] = [
    {
      key: 'smartphone', title: 'Smartphones', detail: from('smartphone'), cta: 'Shop now',
      to: '/products?category=smartphone', image: heroImage('photo-1574944985070-8f3ebc6b79d2'),
      alt: 'Two smartphones with large camera modules, close up',
    },
    {
      key: 'audio', title: 'Audio', detail: from('audio'), cta: 'Shop now',
      to: '/products?category=audio', image: heroImage('photo-1583394838336-acd977736f90'),
      alt: 'Black over-ear headphones on a light background',
    },
    {
      key: 'wearable', title: 'Smartwatches', detail: from('wearable'), cta: 'Shop now',
      to: '/products?category=wearable', image: heroImage('photo-1523275335684-37898b6baf30'),
      alt: 'Two white smartwatches on a grey surface',
    },
    {
      // Prices as published on the Services page.
      key: 'repair', title: 'Same-day repairs', detail: 'Battery from ₹899 · Screen from ₹1,499', cta: 'Book a repair',
      to: '/book', image: heroImage('photo-1592750475338-74b7b21085ab'),
      alt: 'The rear cameras of a smartphone in close-up',
    },
  ]

  const tiles: CategoryTile[] = CATEGORIES.map((c) => {
    const off = byCategory[c.key]?.maxOff ?? 0
    return {
      key: c.key,
      label: off > 0 ? `Up to ${off}% off` : c.name,
      detail: off > 0 ? c.name : 'Shop now',
      image: cropped(unsplash(c.photo), 1.2, [360, 540, 720, 960, 1200]),
      to: `/products?category=${c.key}`,
    }
  })

  // Best sellers are the products staff mark as featured in the CMS; the
  // deals are the biggest discounts among the rest.
  const best = useMemo(() => {
    if (!products) return null
    const featured = products.filter((p) => p.featured)
    return (featured.length ? featured : products).slice(0, 8)
  }, [products])

  const deals = useMemo(() => {
    if (!products || !best) return null
    const shown = new Set(best.map((p) => p.id))
    return products
      .filter((p) => !shown.has(p.id) && p.discount > 0)
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 4)
  }, [products, best])

  return (
    <div className="st bg-white">
      <h1 className="sr-only">
        {settings.shop_name} — phones, accessories and same-day mobile repairs on Ratu Road, Ranchi
      </h1>

      <HeroSlider slides={slides} />
      <CategoryTiles tiles={tiles} />

      <ProductShowcase
        id="best-sellers"
        title="Best seller"
        subtitle="Picked at our counter"
        products={best}
        placeholders={8}
        viewAll={{ to: '/products', label: 'View all products' }}
      />

      <PromoBanner
        image="/shop/shop-03.jpg"
        alt="Staff at the Vaishnavi Mobile Point counter"
        title="Screen repair"
        text="Original and service-pack displays fitted in 60–90 minutes, with fresh waterproof adhesive and a written warranty slip."
        cta="Book a repair"
        to="/book"
      />

      <ProductShowcase
        id="hot-deals"
        title="Hot deal"
        subtitle="Don't miss today's biggest savings"
        products={deals}
      />

      <Testimonials
        reviews={reviews}
        image={{
          phone: cropped(unsplash('photo-1556656793-08538906a9f8'), 0.6, [480, 720, 960, 1290], 70),
          desktop: cropped(unsplash('photo-1556656793-08538906a9f8'), 2.3, [1280, 1920, 2560], 70),
        }}
      />
      <ShopGallery />
    </div>
  )
}
