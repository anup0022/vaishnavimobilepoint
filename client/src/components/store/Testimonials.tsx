import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import type { Review } from '@/lib/api'

/**
 * One review at a time over a soft photograph: avatar, stars, the review,
 * name and what it was for. Arrows at the edges and left/right keys step
 * through them.
 */
export default function Testimonials({ reviews, image }: { reviews: Review[] | null; image: string }) {
  const [index, setIndex] = useState(0)
  const count = reviews?.length ?? 0

  useEffect(() => {
    if (index >= count) setIndex(0)
  }, [count, index])

  if (reviews && count === 0) return null

  const go = (step: number) => setIndex((i) => (count ? (i + step + count) % count : 0))
  const review = reviews?.[count ? index % count : 0]
  const initials = review?.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <section
      className="relative overflow-hidden py-[60px] lg:py-20"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1)
        if (e.key === 'ArrowRight') go(1)
      }}
    >
      <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      {/* Lighter at the edges so the photograph shows, whiter behind the
          review so the text keeps its contrast wherever the photo is dark. */}
      <div
        className="absolute inset-0 bg-[radial-gradient(60%_65%_at_50%_58%,rgb(255_255_255/0.86),rgb(255_255_255/0.55))]"
        aria-hidden="true"
      />

      <div className="st-container relative">
        <h2 className="st-title">Testimonials</h2>

        <div className="relative mt-[60px] lg:mt-[75px]">
          {review ? (
            <figure className="mx-auto max-w-[770px] px-12 text-center lg:px-0" aria-live="polite">
              {review.avatar_url ? (
                <img src={review.avatar_url} alt="" loading="lazy" className="mx-auto h-20 w-20 rounded-full object-cover" />
              ) : (
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-[22px] font-medium text-black">
                  {initials}
                </span>
              )}
              <div className="mt-5 flex justify-center gap-[3px]" role="img" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className={i < review.rating ? 'fill-[var(--st-accent)] text-[var(--st-accent)]' : 'text-black/25'}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote className="mt-4 line-clamp-5 text-[17px] leading-[1.8] text-[#555] sm:text-[18px]">
                {review.message}
              </blockquote>
              <figcaption className="mt-5">
                <span className="block text-[16px] uppercase leading-[1.8]">{review.name}</span>
                <span className="block text-[12px] uppercase leading-[1.8] tracking-[0.04em] text-[var(--st-accent-ink)]">
                  {[review.service, review.city].filter(Boolean).join(' · ')}
                </span>
              </figcaption>
            </figure>
          ) : (
            <div className="mx-auto h-64 max-w-xl animate-pulse bg-white/60" aria-hidden="true" />
          )}

          {count > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                className="absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_10px_rgb(0_0_0/0.08)] transition-colors hover:bg-black hover:text-white"
                aria-label="Previous review"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => go(1)}
                className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_10px_rgb(0_0_0/0.08)] transition-colors hover:bg-black hover:text-white"
                aria-label="Next review"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center">
          <Link to="/feedback" className="inline-block py-2 text-[13px] font-medium uppercase tracking-[0.12em] text-black underline-offset-4 hover:underline">
            Read all reviews
          </Link>
        </p>
      </div>
    </section>
  )
}
