import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useSettings } from '@/lib/useSettings'
import './HomeHero.css'

const CLIP_1080 =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e02bb27f-80d8-445f-a03e-1b609dac4261.mp4'
const CLIP_720 =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e8eb434f-d097-4b1b-b9e6-c8b46fa43040.mp4'
const POSTER =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/5e018553-cb8a-420a-819f-fcdfa08e5df0.jpg'

/** The clip is 5.04s; used only until the real duration arrives. */
const FALLBACK_DURATION = 5.04
/** The camera only climbs while copy is on screen; clouds own the rest. */
const CLIMB_END = 0.46

const HEADLINE = ['EVERY PHONE', 'YOU WANT.', 'EVERY REPAIR', 'YOU NEED.']

function IconSeal() {
  return (
    <svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="17"
        cy="17"
        r="16.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1.6 4.2"
      />
      <circle cx="17" cy="17" r="11" fill="currentColor" />
      <path
        d="m12.7 17.3 2.9 2.9 5.8-6"
        stroke="#0a0b0c"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconSteps() {
  return (
    <svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="21" width="9" height="11" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="12.5" y="14" width="9" height="18" rx="1" fill="currentColor" opacity="0.78" />
      <rect x="23" y="6" width="9" height="26" rx="1" fill="currentColor" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="17"
        cy="17"
        r="16.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1.6 4.2"
      />
      <path d="M17 7 24.6 9.9v5.5c0 4.5-3.1 8.5-7.6 9.8-4.5-1.3-7.6-5.3-7.6-9.8V9.9L17 7Z" fill="currentColor" />
      <rect x="14.1" y="16.1" width="5.8" height="4.8" rx="1" fill="#0a0b0c" />
      <path d="M15.4 16.1v-1.4a1.6 1.6 0 0 1 3.2 0v1.4" stroke="#0a0b0c" strokeWidth="1.3" />
    </svg>
  )
}

interface Feature {
  key: string
  icon: ReactNode
  /** Rendered as type rather than as an SVG. */
  glyph?: boolean
  /** Set line by line so the breaks match the drawing. */
  title: string[]
  body: string[]
  place: string
}

const FEATURES: Feature[] = [
  {
    key: 'parts',
    icon: <IconSeal />,
    title: ['Genuine parts', 'only'],
    body: [
      'Service-pack displays and full-capacity',
      'batteries, fitted with fresh adhesive and',
      'billed with a warranty you can verify.',
    ],
    place: 'r1l',
  },
  {
    key: 'track',
    icon: <IconSteps />,
    title: ['Track it', 'live'],
    body: [
      'Every repair gets a ticket number. Check',
      'exactly where your phone is from home',
      'instead of calling the shop five times.',
    ],
    place: 'r1r',
  },
  {
    key: 'price',
    icon: '\u20B9',
    glyph: true,
    title: ['Price before', 'work'],
    body: [
      'A written estimate before a single screw',
      'turns. No hidden charges and no surprise',
      'additions when you come to collect.',
    ],
    place: 'r2l',
  },
  {
    key: 'data',
    icon: <IconShield />,
    title: ['Your data', 'stays yours'],
    body: [
      'Nothing copied, nothing kept. Photos and',
      'chats go back to your device and are',
      'wiped from our bench the same day.',
    ],
    place: 'r2r',
  },
]

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Distance from the top of the document to `el`, ignoring any transform
 *  an ancestor happens to be carrying (the route wrapper animates on y). */
function layoutTop(el: HTMLElement): number {
  let top = 0
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop
  }
  return top
}

function pickClip(): string {
  if (typeof window === 'undefined') return CLIP_1080
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  return saveData || window.matchMedia('(max-width: 900px)').matches ? CLIP_720 : CLIP_1080
}

/**
 * The homepage scroll track.
 *
 * Deliberately its own component with its own stylesheet: the dock, the
 * footer and the nine other routes are out of scope, and nothing in here
 * is reachable from them. The clip is never played — scrolling scrubs
 * `currentTime` and nothing else in the scene moves.
 */
export default function HomeHero() {
  const settings = useSettings()
  const trackRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [dock, setDock] = useState(76)
  const [clip] = useState(pickClip)

  /*
   * The dock is sticky-but-in-flow, and the announcement bar above it only
   * exists on some days, so its height is not a number that can be hard
   * coded. Measure where the track actually lands and pull it up by exactly
   * that much; once the pull is right the measurement reads zero, so this
   * settles in a single pass.
   */
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return

    const sync = () => {
      const drift = layoutTop(el)
      if (Math.abs(drift) >= 1) setDock((current) => Math.max(0, Math.round(current + drift)))
    }

    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [settings.announcement])

  useEffect(() => {
    const track = trackRef.current
    const video = videoRef.current
    const content = contentRef.current
    if (!track || !video || !content) return

    // `end` is the scroll distance that maps onto the clip; the extra
    // viewport below it is the run-out that lets the cloud frame hold
    // still while the testimonials rise over it.
    let end = 1
    let knee = 0.5
    let cur = 0
    let frame = 0
    let shown = -1

    const measure = () => {
      const vh = window.innerHeight
      let bottom = 0
      for (const block of content.querySelectorAll<HTMLElement>('.vmp-feat')) {
        bottom = Math.max(bottom, block.offsetTop + block.offsetHeight)
      }
      end = Math.max(1, bottom + vh * 0.75)
      knee = clamp01(bottom / end) || 0.5
      track.style.height = `${Math.round(end + vh)}px`
    }

    const tick = () => {
      const scrolled = -track.getBoundingClientRect().top
      const p = clamp01(scrolled / end)
      const progress =
        p < knee ? (p / knee) * CLIMB_END : CLIMB_END + ((p - knee) / (1 - knee)) * (1 - CLIMB_END)
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : FALLBACK_DURATION
      const target = progress * (duration - 1 / 48)

      cur += (target - cur) * 0.22
      if (!video.seeking && Math.abs(video.currentTime - cur) > 1 / 60) video.currentTime = cur

      // The opening card belongs to the first screen only: it clears over
      // the first half viewport so the headline arrives to an empty frame.
      const card = cardRef.current
      if (card) {
        const fade = 1 - clamp01(scrolled / (window.innerHeight * 0.5))
        if (Math.abs(fade - shown) > 0.004) {
          shown = fade
          card.style.opacity = String(fade)
          card.style.visibility = fade < 0.02 ? 'hidden' : 'visible'
        }
      }

      frame = requestAnimationFrame(tick)
    }

    // Mobile Safari will not seek a video whose decoder has never been
    // handed a frame, so it is started and stopped once up front.
    const prime = () => {
      void video
        .play()
        .then(() => video.pause())
        .catch(() => {})
    }

    measure()
    prime()
    frame = requestAnimationFrame(tick)

    video.addEventListener('loadedmetadata', measure)
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)

    return () => {
      cancelAnimationFrame(frame)
      video.removeEventListener('loadedmetadata', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <section
      ref={trackRef}
      id="home"
      className="vmp-track"
      style={{ '--vmp-dock': `${dock}px` } as CSSProperties}
      aria-labelledby="vmp-headline"
    >
      <div className="vmp-scene">
        <video
          ref={videoRef}
          className="vmp-video"
          src={clip}
          poster={POSTER}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="vmp-tint" aria-hidden="true" />

        <div className="vmp-card" ref={cardRef}>
          <div className="vmp-card-mid">
            <p className="vmp-card-kicker">Ranchi &middot; Since 2005</p>
            <p className="vmp-card-name">{settings.shop_name}</p>
            <span className="vmp-card-rule" aria-hidden="true" />
            <p className="vmp-card-sub">
              Phones, accessories and same-day repairs in Churi Centre Gali, just off Ratu Road.
            </p>
          </div>

          <div className="vmp-card-foot">
            <span className="vmp-card-meta">
              {settings.city || 'Ranchi'}, Jharkhand &middot; Open 7 days
            </span>
            <span className="vmp-card-cue">
              <i aria-hidden="true" />
              Scroll
            </span>
          </div>
        </div>
      </div>

      <div className="vmp-content" ref={contentRef}>
        <div className="vmp-intro">
          <p className="vmp-eyebrow">Why us</p>
          <h1 id="vmp-headline" className="vmp-headline">
            {HEADLINE.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
        </div>

        {FEATURES.map((feature, i) => (
          <div
            key={feature.key}
            className={`vmp-feat vmp-feat--${feature.place}${i === 0 ? ' vmp-feat--first' : ''}`}
          >
            <span className={`vmp-ft-i${feature.glyph ? ' vmp-ft-i--glyph' : ''}`} aria-hidden="true">
              {feature.icon}
            </span>
            <h2 className="vmp-ft-t">
              {feature.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p className="vmp-ft-b">
              {feature.body.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
