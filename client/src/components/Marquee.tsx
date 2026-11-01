import type { ReactNode } from 'react'

interface Props {
  items: ReactNode[]
  className?: string
}

/** Edge-faded infinite ticker. The list is duplicated for a seamless loop. */
export default function Marquee({ items, className = '' }: Props) {
  return (
    <div
      className={`marquee-host relative overflow-hidden ${className}`}
      style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}
    >
      <div className="animate-marquee flex w-max items-center gap-12">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="shrink-0" aria-hidden={i >= items.length}>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
