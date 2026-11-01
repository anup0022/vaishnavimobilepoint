import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface Props {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  priority?: boolean
}

/** Catalogue photos come from a remote CDN; a dropped request degrades to a
 *  tinted block rather than a broken-image glyph. */
export default function SmartImg({ src, alt, className = '', imgClassName = '', priority = false }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(src ? 'loading' : 'failed')

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {state === 'loading' && <div className="ph absolute inset-0" />}
      {state === 'failed' ? (
        <div className="absolute inset-0 grid place-items-center bg-black/5" role="img" aria-label={alt}>
          <ImageOff size={24} className="opacity-40" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            state === 'ready' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}
    </div>
  )
}
