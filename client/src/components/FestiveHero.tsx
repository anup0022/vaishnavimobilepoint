import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useSettings } from '@/lib/useSettings'
import './FestiveHero.css'

/** Lakshmi Puja, 2026. */
const FESTIVAL_DAY = '8th'
const FESTIVAL_MONTH = 'November'

/** Reads as the festival's three "things on offer", like the poster's menu. */
const COUNTER = ['Phones', 'Accessories', 'Repairs']

const BURST_RAYS = [
  { angle: 0, long: true },
  { angle: 45, long: false },
  { angle: 90, long: true },
  { angle: 135, long: false },
  { angle: 180, long: true },
  { angle: 225, long: false },
  { angle: 270, long: true },
  { angle: 315, long: false },
]

const BURST_COLOURS = ['#ff2d87', '#ffc93c', '#17c79a', '#49b4ff', '#ff7a3d', '#c98cff', '#ff2d87', '#ffc93c']

const MANDALA_PETALS = Array.from({ length: 16 }, (_, i) => i * 22.5)

/** x, y and width as percentages of the stage, plus a tilt. */
const STARS = [
  { x: 12, y: 8, w: 9, r: -12 },
  { x: 60, y: 4, w: 7, r: 14 },
  { x: 84, y: 16, w: 11, r: -6 },
  { x: 6, y: 56, w: 6, r: 18 },
  { x: 90, y: 58, w: 8, r: -16 },
  { x: 34, y: 84, w: 7, r: 9 },
  { x: 70, y: 90, w: 5, r: -20 },
]

function Stars() {
  return (
    <div className="dw-stars" aria-hidden="true">
      {STARS.map((star) => (
        <svg
          key={`${star.x}-${star.y}`}
          viewBox="0 0 100 95"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.w}%`, rotate: `${star.r}deg` }}
        >
          <path d="M50 0 61.8 34.5H98L68.8 55.9 80.1 90 50 68.9 19.9 90l11.3-34.1L2 34.5h36.2z" />
        </svg>
      ))}
    </div>
  )
}

function Mandala({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="-100 -100 200 200" fill="none" aria-hidden="true">
      <circle r="97" stroke="currentColor" strokeWidth="0.9" />
      <circle r="88" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 7" />
      {MANDALA_PETALS.map((angle) => (
        <path
          key={angle}
          d="M0 -78C14 -58 14 -34 0 -18C-14 -34 -14 -58 0 -78Z"
          transform={`rotate(${angle})`}
          stroke="currentColor"
          strokeWidth="0.9"
        />
      ))}
      <circle r="30" stroke="currentColor" strokeWidth="0.9" />
      <circle r="11" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  )
}

function Diya({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 160 124" fill="none" aria-hidden="true">
      <g className="dw-flame">
        <path d="M80 2c0 16 14 19 14 32a14 14 0 1 1-28 0C66 21 80 18 80 2Z" fill="#ffae1f" />
        <path d="M80 18c0 9 7 11 7 18a7 7 0 1 1-14 0c0-7 7-9 7-18Z" fill="#fff4bf" />
      </g>
      <path d="M10 62h140c0 30-31 52-70 52S10 92 10 62Z" fill="#17c79a" />
      <path d="M10 62h140a12 12 0 0 1-12 12H22a12 12 0 0 1-12-12Z" fill="#0ca77e" />
      <g fill="#ff2d87">
        <path d="M44 84a8 8 0 0 1 16 0 8 8 0 0 1-16 0Z" />
        <path d="M72 90a8 8 0 0 1 16 0 8 8 0 0 1-16 0Z" />
        <path d="M100 84a8 8 0 0 1 16 0 8 8 0 0 1-16 0Z" />
      </g>
      <g stroke="#fff3c4" strokeWidth="3" strokeLinecap="round">
        <path d="M34 72v6M126 72v6" />
      </g>
    </svg>
  )
}

function Burst({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="-50 -50 100 100" aria-hidden="true">
      {BURST_RAYS.map((ray, i) => (
        <line
          key={ray.angle}
          x1="0"
          y1="-10"
          x2="0"
          y2={ray.long ? -44 : -32}
          transform={`rotate(${ray.angle})`}
          stroke={BURST_COLOURS[i]}
          strokeWidth="5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

/** Distance to the top of the document, ignoring the route's enter transform. */
function layoutTop(el: HTMLElement): number {
  let top = 0
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop
  }
  return top
}

/**
 * Diwali takeover for the homepage hero.
 *
 * Self-contained on purpose: its own stylesheet, its own palette and no
 * dependency on the site's ink/mist ramps, so the whole thing can be
 * switched off — or deleted — without touching anything else. Every
 * ornament is drawn rather than loaded, so the banner costs no requests.
 */
export default function FestiveHero() {
  const settings = useSettings()
  const ref = useRef<HTMLElement>(null)
  const [dock, setDock] = useState(76)

  /* The dock is sticky but still in flow, and the announcement bar above it
     only exists on some days — so the pull-up has to be measured, not
     guessed. Once the pull is right the measurement reads zero. */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const sync = () => {
      const drift = layoutTop(el)
      if (Math.abs(drift) >= 1) setDock((current) => Math.max(0, Math.round(current + drift)))
    }

    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [settings.announcement])

  return (
    <section
      ref={ref}
      id="home"
      className="dw"
      style={{ '--dw-dock': `${dock}px` } as CSSProperties}
      aria-labelledby="dw-headline"
    >
      <div className="dw-stage">
        <div className="dw-sky" aria-hidden="true" />
        <Stars />
        <Mandala className="dw-mandala dw-mandala--tl" />
        <Mandala className="dw-mandala dw-mandala--br" />
        <Mandala className="dw-mandala dw-mandala--bc" />
        <div className="dw-halo" aria-hidden="true" />

        <Diya className="dw-diya dw-diya--l" />
        <Diya className="dw-diya dw-diya--r" />
        <Burst className="dw-burst dw-burst--a" />
        <Burst className="dw-burst dw-burst--b" />
        <Burst className="dw-burst dw-burst--c" />

        <div className="dw-grid">
          <div className="dw-side dw-side--l">
            <p className="dw-kicker">
              {settings.city || 'Ranchi'} &middot; Since 2005
            </p>

            <div className="dw-when">
              <p className="dw-date">
                <span>{FESTIVAL_DAY}</span>
                <span>{FESTIVAL_MONTH}</span>
              </p>
              <ul className="dw-counter">
                {COUNTER.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <p className="dw-body">
              Sealed stock, GST billing and the brand's own India warranty — now at festive
              pricing on phones, audio and smartwatches. Walk into Churi Centre Gali, off
              Ratu Road, or book the bench before the lights go up.
            </p>

            <div className="dw-actions">
              <Link to="/products" className="dw-cta">
                Shop festive offers <ArrowRight size={15} />
              </Link>
              <Link to="/book" className="dw-link">
                Book a repair
              </Link>
            </div>
          </div>

          <div className="dw-lockup">
            <p className="dw-hello">Happy</p>
            <h1 id="dw-headline" className="dw-title">
              Diwali
            </h1>
            <p className="dw-sub">
              Festival of <span>Offers</span>
            </p>
          </div>

          <div className="dw-side dw-side--r">
            <p className="dw-eyebrow">Festive special</p>
            <p className="dw-body">
              Free tempered glass and six months of screen protection with every new phone,
              exchange value on your old handset across the counter, and a same-day display
              or battery swap so nobody spends the festival on a dead screen.
            </p>
            <p className="dw-note">
              Open seven days a week &middot;{' '}
              <span>{settings.phone_primary}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
