import { motion, useScroll, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'

/** Thin gradient bar showing how far down the page you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 })

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[150] h-[3px] origin-left bg-gradient-to-r from-key to-brand-600"
    />
  )
}

/** Soft light that trails the cursor. Mouse-only, and skipped when the
 *  visitor has asked for reduced motion. */
export function CursorGlow() {
  const [pos, setPos] = useState({ x: -400, y: -400 })
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || calm) return

    setEnabled(true)
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  if (!enabled) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[1] h-[480px] w-[480px] rounded-full opacity-60 transition-transform duration-300 ease-out"
      style={{
        left: pos.x - 240,
        top: pos.y - 240,
        // The two studio lights follow the pointer, same hues as the stage.
        background: 'radial-gradient(circle, rgba(240,165,74,0.10) 0%, rgba(42,125,225,0.07) 42%, transparent 70%)',
      }}
    />
  )
}

/** Brief splash while the first route and fonts settle. */
export function Preloader() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 1100)
    return () => clearTimeout(timer)
  }, [])

  if (done) return null

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-ink-950"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 0.8, duration: 0.3 }}
      onAnimationComplete={() => setDone(true)}
    >
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative h-20 w-20">
          <span className="absolute inset-0 rounded-2xl border-2 border-key/40 animate-pulse-ring" />
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-key text-2xl font-extrabold text-key-ink">
            V
          </span>
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-ink-800">
          <motion.div
            className="h-full rounded-full bg-key"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.95, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
