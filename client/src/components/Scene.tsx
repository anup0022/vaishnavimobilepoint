import type { ReactNode } from 'react'

interface Props {
  id: string
  children: ReactNode
  /** Held still by ScrollTrigger while its contents play. Desktop only. */
  pinned?: boolean
  className?: string
  /** Opts out of the centred container, for a scene that bleeds full width. */
  bare?: boolean
}

/** One full-height scene on the home page. */
export default function Scene({ id, children, pinned = false, className = '', bare = false }: Props) {
  return (
    <section id={id} className={`scene ${pinned ? 'scene-pinned' : ''} ${className}`}>
      {bare ? children : <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">{children}</div>}
    </section>
  )
}
