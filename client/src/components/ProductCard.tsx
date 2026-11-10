import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Star } from 'lucide-react'
import type { Product } from '@/lib/api'
import { money, AVAILABILITY_LABELS } from '@/lib/format'
import SmartImage from './SmartImage'
import { cropped, SQUARE_WIDTHS } from '@/lib/images'
import TiltCard from './TiltCard'

const AVAILABILITY_STYLE: Record<string, string> = {
  in_stock: 'border-success/35 bg-success/10 text-success',
  low_stock: 'border-warn/35 bg-warn/10 text-warn',
  out_of_stock: 'border-danger/35 bg-danger/10 text-danger',
}

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const image = cropped(product.image_url, 1, SQUARE_WIDTHS)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      <TiltCard intensity={6}>
        <Link
          to={`/products/${product.slug}`}
          className="card-sheen group relative active:scale-[0.985] flex h-full flex-col overflow-hidden rounded-3xl border border-ink-700 bg-ink-850 lift transition-[border-color,box-shadow] duration-300 hover:border-brand-600/45 hover:shadow-[0_0_0_1px_rgb(42_125_225/0.18),0_26px_60px_-28px_rgb(42_125_225/0.5)]"
        >
          <div className="relative aspect-square overflow-hidden bg-ink-950">
            <SmartImage
              src={image.src}
              srcSet={image.srcSet}
              sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(50vw - 32px), 360px"
              alt={product.name}
              seed={product.sku}
              className="h-full w-full transition-transform duration-700 group-hover:scale-110"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-850 to-transparent" />

            {product.discount > 0 && (
              <span className="readout absolute left-3 top-3 rounded-lg bg-key px-2.5 py-1 text-xs font-bold text-key-ink">
                −{product.discount}%
              </span>
            )}
            {product.featured && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-brand-600/35 bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                <Star size={11} fill="currentColor" /> Popular
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="readout text-[11px] uppercase tracking-wider text-mist-500">{product.brand}</span>
              <span className={`chip border text-[10px] ${AVAILABILITY_STYLE[product.availability]}`}>
                {AVAILABILITY_LABELS[product.availability]}
              </span>
            </div>

            <h3 className="mb-3 line-clamp-2 text-lg font-semibold leading-snug transition-colors group-hover:text-brand-700">
              {product.name}
            </h3>

            <div className="mt-auto flex items-end justify-between gap-3">
              <div>
                <div className="readout text-xl font-bold text-mist-50">{money(product.price)}</div>
                {product.mrp > product.price && (
                  <div className="readout text-sm text-mist-500 line-through">{money(product.mrp)}</div>
                )}
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-700 bg-ink-800 text-mist-400 transition-all duration-300 group-hover:border-transparent group-hover:bg-brand-600 group-hover:text-white">
                <ArrowUpRight size={18} />
              </span>
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  )
}
