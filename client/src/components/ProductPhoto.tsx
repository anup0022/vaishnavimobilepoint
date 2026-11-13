import { Cable, Headphones, Smartphone, Tablet, Watch } from 'lucide-react'
import type { Product } from '@/lib/api'
import { cropped, SQUARE_WIDTHS } from '@/lib/images'
import SmartImage from './SmartImage'

const STOCK_HOST = 'https://images.unsplash.com/'

const ICONS: Record<string, typeof Smartphone> = {
  smartphone: Smartphone,
  tablet: Tablet,
  wearable: Watch,
  audio: Headphones,
  accessory: Cable,
}

/**
 * The demo catalogue pointed every product at an Unsplash photograph of some
 * other device: the "iPhone 14" picture was not an iPhone 14, yet its alt
 * text said it was. A product counts as photographed once staff upload its
 * own picture in the CMS (Stock, edit the item, Photo); until then it shows a
 * tile with its brand and model rather than someone else's phone.
 */
export function hasRealPhoto(product: Pick<Product, 'image_url'>): boolean {
  return Boolean(product.image_url) && !product.image_url.startsWith(STOCK_HOST)
}

/** The outline icon for a product's category, for tiles and thumbnails. */
export function categoryIcon(category: string): typeof Smartphone {
  return ICONS[category] ?? Smartphone
}

interface Props {
  product: Pick<Product, 'name' | 'brand' | 'category' | 'image_url' | 'slug'>
  /** How wide the slot is, for the browser's choice among photo widths. */
  sizes: string
  className?: string
  /** Above the fold: load eagerly (lib/images.ts, SmartImage). */
  priority?: boolean
}

export default function ProductPhoto({ product, sizes, className = '', priority = false }: Props) {
  if (hasRealPhoto(product)) {
    const image = cropped(product.image_url, 1, SQUARE_WIDTHS)
    return (
      <SmartImage
        src={image.src}
        srcSet={image.srcSet}
        sizes={sizes}
        alt={product.name}
        seed={product.slug}
        priority={priority}
        className={className}
      />
    )
  }

  const Icon = categoryIcon(product.category)
  return (
    <div
      role="img"
      aria-label={`${product.name}: photo coming soon`}
      className={`flex flex-col items-center justify-center gap-3 p-6 text-center ${className}`}
    >
      <Icon size={44} strokeWidth={1.25} className="opacity-35" aria-hidden="true" />
      {/* 75% of the text colour keeps both small lines above WCAG AA (4.5:1) on the light tiles. */}
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{product.brand}</span>
      <span className="max-w-[16ch] text-lg font-semibold leading-snug">{product.name}</span>
      <span className="text-[12px] opacity-75">Photo coming soon</span>
    </div>
  )
}
