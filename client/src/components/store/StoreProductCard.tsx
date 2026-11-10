import { Link } from 'react-router-dom'
import type { Product } from '@/lib/api'
import { money } from '@/lib/format'
import SmartImage from '@/components/SmartImage'

/** Grey tile, red "Sale" ribbon, name, teal price over the struck-out MRP. */
export default function StoreProductCard({ product }: { product: Product }) {
  const onSale = product.mrp > product.price
  const soldOut = product.availability === 'out_of_stock'

  return (
    <Link to={`/products/${product.slug}`} className="group block pb-5 text-center">
      <div className="relative aspect-square overflow-hidden bg-[var(--st-tile)]">
        <SmartImage
          src={product.image_url}
          alt={product.name}
          seed={product.slug}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        {onSale && !soldOut && <span className="st-ribbon">Sale</span>}
        {soldOut && (
          <span className="absolute left-0 top-4 bg-black px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-white">
            Sold out
          </span>
        )}
      </div>
      <h3 className="mt-[18px] px-2 text-[16px] font-medium leading-[1.3] tracking-[0.02em] text-black transition-colors group-hover:text-[var(--st-accent-ink)]">
        {product.name}
      </h3>
      <p className="mt-1 text-[15px] leading-[1.8]">
        <span className="st-price">{money(product.price)}</span>
        {onSale && <span className="st-mrp ml-2">{money(product.mrp)}</span>}
      </p>
    </Link>
  )
}
