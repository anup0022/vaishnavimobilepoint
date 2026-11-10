import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface HeroSlide {
  key: string
  title: string
  /** "from ₹13,490" — worked out from the live catalogue by the caller. */
  detail: string
  cta: string
  to: string
  image: { src: string; srcSet: string }
  alt: string
}

const ADVANCE_MS = 6000

/**
 * Full-width slides, each a photograph with a centred white card: title,
 * a short teal rule, a line of detail and a black button. Advances on its
 * own unless the pointer or keyboard focus is inside it, or the visitor
 * prefers reduced motion. Swipe on touch screens.
 *
 * On large screens the category tiles that follow are pulled up over the
 * bottom 140px of the slide, so the slide grows with the width (as the
 * reference store's does) and the card stays clear of them.
 */
export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [calm, setCalm] = useState(false)
  const swipe = useRef<number | null>(null)
  const count = slides.length

  useEffect(() => {
    setCalm(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (paused || calm || count < 2) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [index, paused, calm, count])

  const go = (step: number) => setIndex((i) => (i + step + count) % count)

  return (
    <section
      className="relative h-[507px] overflow-hidden bg-[#e9e9e9] sm:h-[600px] lg:h-[min(calc(40vw+253px),1100px)]"
      aria-roledescription="carousel"
      aria-label="Featured in store"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => (swipe.current = e.clientX)}
      onPointerUp={(e) => {
        if (swipe.current === null) return
        const dx = e.clientX - swipe.current
        swipe.current = null
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
      }}
    >
      {slides.map((slide, i) => {
        const active = i === index
        return (
          <div
            key={slide.key}
            className={`absolute inset-0 ${active ? '' : 'pointer-events-none'}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${slide.title}`}
            aria-hidden={!active}
          >
            <img
              src={slide.image.src}
              srcSet={slide.image.srcSet}
              sizes="100vw"
              alt={slide.alt}
              className={`h-full w-full object-cover transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0'}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              draggable={false}
            />
            {/* The photographs cross-fade; the cards take turns — the old one
                leaves before the new one arrives — so two titles never show
                through each other mid-change. */}
            <div
              className={`absolute inset-0 flex items-center justify-center px-5 transition-opacity ${
                active ? 'opacity-100 delay-300 duration-300' : 'opacity-0 duration-200'
              }`}
            >
              {/* Sized by its title, as in the reference: 50px above and
                  below, 75px either side, narrower on small phones. */}
              <div className="max-w-full bg-white px-[30px] py-[50px] text-center min-[420px]:px-[50px] sm:px-[75px]">
                <h2 className="relative pb-5 text-[length:clamp(28px,2.632vw,50px)] font-medium uppercase leading-[1.2] tracking-[1px] text-black after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-[70px] after:-translate-x-1/2 after:bg-[var(--st-accent)]">
                  {slide.title}
                </h2>
                <p className="mt-[25px] min-h-[26px] text-[18px] leading-[26px] text-black sm:text-[20px]">{slide.detail}</p>
                <Link to={slide.to} className="st-btn mt-[35px]" tabIndex={active ? 0 : -1}>
                  {slide.cta}
                </Link>
              </div>
            </div>
          </div>
        )
      })}

      {count > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-0 top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 items-center justify-center bg-black/50 text-white transition-colors hover:bg-black sm:flex lg:top-[calc(50%-70px)]"
            aria-label="Previous slide"
          >
            <ChevronLeft size={28} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-0 top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 items-center justify-center bg-black/50 text-white transition-colors hover:bg-black sm:flex lg:top-[calc(50%-70px)]"
            aria-label="Next slide"
          >
            <ChevronRight size={28} strokeWidth={1.5} />
          </button>
        </>
      )}
    </section>
  )
}
