import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Review } from '@/lib/api'
import './HomeTrust.css'

const HEADING = ['Trusted', 'by Ranchi', 'since 2005']

function Stars({ rating }: { rating: number }) {
  return (
    <span className="vmp-trust-stars" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true" className={i < rating ? 'on' : ''}>
          <path d="M12 2.6 14.9 8.5 21.4 9.4 16.7 14 17.8 20.5 12 17.4 6.2 20.5 7.3 14 2.6 9.4 9.1 8.5Z" />
        </svg>
      ))}
    </span>
  )
}

/**
 * The testimonial slider the cloud frame resolves into. Homepage only —
 * it carries the reviews that used to sit in their own dark scene
 * further down the route.
 */
export default function HomeTrust({ reviews }: { reviews: Review[] }) {
  const [index, setIndex] = useState(0)
  const drag = useRef<{ x: number; id: number } | null>(null)

  const count = reviews.length
  const active = count ? index % count : 0
  const go = (step: number) => setIndex((i) => (count ? (i + step + count) % count : 0))

  useEffect(() => {
    if (index >= count) setIndex(0)
  }, [count, index])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    go(e.key === 'ArrowLeft' ? -1 : 1)
  }

  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, id: e.pointerId }
  }

  const onPointerUp = (e: PointerEvent) => {
    const start = drag.current
    drag.current = null
    if (!start || start.id !== e.pointerId) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
  }

  return (
    <section id="reviews" className="vmp-trust">
      <div className="vmp-trust-in">
        <header className="vmp-trust-head">
          <h2 className="vmp-trust-h">
            {HEADING.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className="vmp-trust-note">
            From a cracked screen to a dead motherboard, people keep walking back into the same gali
            because every phone on the bench is treated like it matters.
          </p>
        </header>

        {count > 0 && (
          <div
            className="vmp-trust-slider"
            role="group"
            aria-roledescription="carousel"
            aria-label="What customers say"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current = null
            }}
          >
            <div className="vmp-trust-rail" style={{ transform: `translateX(-${active * 100}%)` }}>
              {reviews.map((review, i) => (
                <figure key={review.id} className="vmp-trust-slide" aria-hidden={i !== active}>
                  <Stars rating={review.rating} />
                  <blockquote className="vmp-trust-say">{review.message}</blockquote>
                  <figcaption className="vmp-trust-who">
                    <span className="vmp-trust-name">{review.name}</span>
                    <span className="vmp-trust-role">
                      {[review.service, review.city].filter(Boolean).join(' \u00b7 ')}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        {count > 1 && (
          <div className="vmp-trust-bar">
            <div className="vmp-trust-arrows">
              <button type="button" onClick={() => go(-1)} aria-label="Previous review">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14.5 5 7.5 12l7 7" />
                </svg>
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next review">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9.5 5 7 7-7 7" />
                </svg>
              </button>
            </div>

            <span className="vmp-trust-count">
              {String(active + 1).padStart(2, '0')}
              <i>/</i>
              {String(count).padStart(2, '0')}
            </span>

            <div className="vmp-trust-dots">
              {reviews.map((review, i) => (
                <button
                  key={review.id}
                  type="button"
                  className={i === active ? 'on' : ''}
                  aria-label={`Review ${i + 1} of ${count}`}
                  aria-current={i === active || undefined}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </div>
        )}

        <Link to="/feedback" className="vmp-trust-more">
          Read all reviews &amp; leave yours
        </Link>
      </div>
    </section>
  )
}
