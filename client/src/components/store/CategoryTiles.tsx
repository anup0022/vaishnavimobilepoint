import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export interface CategoryTile {
  key: string
  /** Big line, e.g. "Up to 22% off" — worked out from the live catalogue. */
  label: string
  /** Small grey line under it: the category. */
  detail: string
  image: string
  to: string
}

const GAP = 30

/**
 * Four tiles in white frames on a pale band. On large screens they sit four
 * across, pulled up over the bottom 140px of the hero. Below that they are a
 * swipeable row — one tile at a time on phones, two on tablets — with dots
 * that show where you are and jump to a tile.
 */
export default function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  const row = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)
  const [stops, setStops] = useState(1)

  const measure = useCallback(() => {
    const el = row.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return
    const pitch = first.offsetWidth + GAP
    const perView = Math.max(1, Math.round((el.clientWidth - 20 + GAP) / pitch))
    setStops(Math.max(1, tiles.length - perView + 1))
    setActive(Math.min(Math.round(el.scrollLeft / pitch), tiles.length - 1))
  }, [tiles.length])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  function goTo(i: number) {
    const el = row.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return
    el.scrollTo({ left: i * (first.offsetWidth + GAP), behavior: 'smooth' })
  }

  return (
    // flow-root: without it the tiles' negative margin collapses through the
    // section, and the band itself rides up over the hero.
    <section className="relative flow-root bg-[var(--st-band)] pb-[50px] lg:pb-[90px]" aria-label="Shop by category">
      <div className="st-container relative z-10 pt-[38px] lg:-mt-[150px] lg:pt-0">
        <ul
          ref={row}
          onScroll={measure}
          className="st-scroll-row grid snap-x snap-mandatory scroll-px-[10px] auto-cols-[100%] grid-flow-col gap-[30px] overflow-x-auto p-[10px] sm:auto-cols-[calc(50%-15px)] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible"
        >
          {tiles.map((tile) => (
            <li key={tile.key} className="snap-start">
              <Link to={tile.to} className="group block text-center">
                <div className="border-[10px] border-white bg-white">
                  <div className="aspect-[6/5] overflow-hidden bg-[var(--st-tile)]">
                    <img
                      src={tile.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>
                <h3 className="mt-5 text-[28px] uppercase leading-[1.8] text-black">{tile.label}</h3>
                <p className="text-[18px] leading-[1.8] text-[var(--st-faint)]">{tile.detail}</p>
              </Link>
            </li>
          ))}
        </ul>

        {stops > 1 && (
          <div className="mt-4 flex justify-center gap-1 lg:hidden">
            {Array.from({ length: stops }, (_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="flex h-6 w-6 items-center justify-center"
                aria-label={`Show category ${i + 1}`}
                aria-current={i === Math.min(active, stops - 1) ? 'true' : undefined}
              >
                <span
                  className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                    i === Math.min(active, stops - 1) ? 'bg-black' : 'bg-black/25'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
