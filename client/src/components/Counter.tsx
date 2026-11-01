import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

interface Props {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
}

/** Counts up to `value` once it scrolls into view. */
export default function Counter({ value, duration = 900, suffix = '', prefix = '', className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const calm = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    // A number that counts up is movement; show the figure instead.
    if (calm) {
      setDisplay(value)
      return
    }
    if (!inView) return
    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      // easeOutExpo keeps the last digits from crawling
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplay(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration, calm])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString('en-IN')}
      {suffix}
    </span>
  )
}
