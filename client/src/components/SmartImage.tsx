import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface Props {
  src: string
  /** Other widths of the same picture, and how wide its slot is (lib/images.ts). */
  srcSet?: string
  sizes?: string
  alt: string
  className?: string
  /** Seeds the fallback gradient so each product gets its own colour. */
  seed?: string
  /** Above-the-fold images load eagerly — lazy-loading the hero delays LCP. */
  priority?: boolean
}

const GRADIENTS = [
  'bg-ink-800',
  'bg-ink-700',
  'bg-brand-600/8',
  'bg-ink-800',
  'bg-brand-600/5',
]

/**
 * Callers that position the image themselves pass `absolute`, but Tailwind
 * emits `.relative` after `.absolute`, so the wrapper's own `relative` won
 * the cascade and the image stayed in flow — which is what grew the Services
 * CTA band to 1249px instead of sitting behind its text.
 */
const POSITIONED = /(^|\s)(absolute|fixed|sticky|static)(\s|$)/

/**
 * Product photos come from a remote CDN, so a dropped request should
 * degrade to a tinted placeholder rather than a broken-image icon.
 */
export default function SmartImage({ src, srcSet, sizes, alt, className = '', seed = '', priority = false }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(src ? 'loading' : 'failed')
  const gradient = GRADIENTS[(seed.length + alt.length) % GRADIENTS.length]
  const position = POSITIONED.test(className) ? '' : 'relative'

  if (state === 'failed') {
    return (
      <div
        className={`flex items-center justify-center ${gradient} ${className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="text-mist-500" size={28} />
      </div>
    )
  }

  return (
    <div className={`${position} overflow-hidden ${className}`}>
      {state === 'loading' && <div className="shimmer absolute inset-0" />}
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setState('ready')}
        onError={() => setState('failed')}
        className={`h-full w-full object-cover transition-opacity duration-500 ${ state === 'ready' ? 'opacity-100' : 'opacity-0' }`}
      />
    </div>
  )
}
