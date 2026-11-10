import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale' | 'none'

/*
 * Travel distance was 36-40px with a 650ms duration. That reads as heavy on a
 * phone: the element is still arriving when the thumb has already moved on.
 * Shorter distance and a faster curve keep the reveal legible without making
 * the reader wait for it.
 */
const OFFSETS: Record<Direction, { y?: number; scale?: number }> = {
  up: { y: 18 },
  down: { y: -18 },
  left: {},
  right: {},
  scale: { scale: 0.96 },
  none: {},
}

/*
 * The horizontal directions used to translate the wrapper on X. On a full-width
 * child that pushed the painted box past the right edge of the viewport until
 * the trigger fired, which grows the layout viewport on a phone — /about and
 * /contact both measured 394px inside a 390px frame. It was invisible because
 * `body { overflow-x: hidden }` hides the scrollbar but not the zoom-out.
 *
 * A clip wipe gives the same directional read and cannot overflow anything,
 * because the element never leaves its own box.
 */
const WIPES: Partial<Record<Direction, { from: string; to: string }>> = {
  left: { from: 'inset(0 100% 0 0)', to: 'inset(0 0% 0 0)' },
  right: { from: 'inset(0 0 0 100%)', to: 'inset(0 0 0 0%)' },
}

interface Props {
  children: ReactNode
  delay?: number
  direction?: Direction
  className?: string
  once?: boolean
  duration?: number
}

/** Fades content in the first time it scrolls into view. */
export default function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className,
  once = true,
  duration = 0.42,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: '-80px' })
  const calm = useReducedMotion()
  const wipe = WIPES[direction]

  /*
   * Reduced motion means no movement, not faster movement. The global CSS rule
   * that collapses transition-duration cannot reach this component, because
   * Framer Motion animates inline style from JavaScript rather than through a
   * CSS transition — so without this branch the reveal still ran, and anything
   * below the fold sat at opacity 0 waiting for a scroll.
   */
  if (calm) return <div className={className}>{children}</div>

  /*
   * A wipe starts fully clipped, and the browser treats a fully clipped
   * element as not on screen at all: watched directly, it never reported
   * itself in view, so it never unclipped — the About photos and timeline and
   * part of Contact stayed invisible for good, and the lazy images inside
   * never even downloaded. The plain outer box is what gets watched; only the
   * inner one is clipped.
   */
  if (wipe) {
    return (
      <div ref={ref} className={className}>
        <motion.div
          initial={{ opacity: 0, clipPath: wipe.from }}
          animate={inView ? { opacity: 1, clipPath: wipe.to } : {}}
          transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...OFFSETS[direction] }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
