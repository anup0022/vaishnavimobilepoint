import { Link } from 'react-router-dom'
import type { Product } from '@/lib/api'
import StoreProductCard from './StoreProductCard'

interface Props {
  id: string
  title: string
  subtitle: string
  products: Product[] | null
  /** How many placeholders to show while the catalogue loads. */
  placeholders?: number
  viewAll?: { to: string; label: string }
}

/** "BEST SELLER" over its subtitle, then a four-across product grid. */
export default function ProductShowcase({ id, title, subtitle, products, placeholders = 4, viewAll }: Props) {
  if (products && products.length === 0) return null

  return (
    <section id={id} className="bg-white pb-[50px] pt-[42px] lg:pb-[70px] lg:pt-[55px]" aria-labelledby={`${id}-title`}>
      <div className="st-container">
        <h2 id={`${id}-title`} className="st-title">{title}</h2>
        <p className="st-sub">{subtitle}</p>

        <div className="mt-10 grid gap-[15px] sm:grid-cols-2 sm:gap-[30px] lg:grid-cols-4">
          {products
            ? products.map((product) => <StoreProductCard key={product.id} product={product} />)
            : Array.from({ length: placeholders }, (_, i) => (
                <div key={i} aria-hidden="true">
                  <div className="aspect-square animate-pulse bg-[var(--st-tile)]" />
                  <div className="mx-auto mt-4 h-4 w-2/3 animate-pulse bg-[var(--st-tile)]" />
                  <div className="mx-auto mt-2 h-4 w-1/3 animate-pulse bg-[var(--st-tile)]" />
                </div>
              ))}
        </div>

        {viewAll && (
          <div className="mt-8 text-center lg:mt-10">
            <Link to={viewAll.to} className="st-btn">{viewAll.label}</Link>
          </div>
        )}
      </div>
    </section>
  )
}
