import { useEffect, useRef } from 'react'

interface Options {
  /** Below this width the panels are taller than the screen, so normal
   *  scrolling is less frustrating than trapping the reader in a panel. */
  minWidth?: number
  /** How long a step takes before the next gesture is accepted. */
  lockMs?: number
}

/**
 * Full-page section scrolling: one wheel notch, swipe or arrow key moves
 * exactly one section instead of scrolling freely.
 *
 * The document keeps doing the actual scrolling (so anchors, focus and
 * browser find all still work) — this only intercepts the gesture and
 * sends the page to the next section.
 */
export function useSectionScroll(ids: string[], { minWidth = 768, lockMs = 820 }: Options = {}) {
  const index = useRef(0)
  const locked = useRef(false)
  const touchY = useRef(0)

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const wide = window.matchMedia(`(min-width: ${minWidth}px)`)

    const sections = () =>
      ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null)

    /** Section whose top is closest to where we are now. */
    function nearest() {
      const list = sections()
      let best = 0
      let bestDist = Infinity
      list.forEach((el, i) => {
        const d = Math.abs(el.getBoundingClientRect().top)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      return best
    }

    function active() {
      return !calm.matches && wide.matches && document.body.style.overflow !== 'hidden'
    }

    /** A panel taller than the screen scrolls through itself before we advance. */
    function canScrollWithin(el: HTMLElement | undefined, dir: number) {
      if (!el) return false
      const slack = el.scrollHeight - el.clientHeight
      if (slack <= 2) return false
      return dir > 0 ? el.scrollTop < slack - 2 : el.scrollTop > 2
    }

    function goTo(target: number) {
      const list = sections()
      const i = Math.max(0, Math.min(list.length - 1, target))
      if (i === index.current && locked.current) return
      index.current = i
      locked.current = true
      list[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => {
        locked.current = false
      }, lockMs)
    }

    function step(dir: number) {
      if (locked.current) return
      index.current = nearest()
      goTo(index.current + dir)
    }

    function onWheel(e: WheelEvent) {
      if (!active()) return
      if (Math.abs(e.deltaY) < 4) return

      const dir = e.deltaY > 0 ? 1 : -1
      const panel = sections()[nearest()]
      // Let a tall panel finish scrolling internally first.
      if (canScrollWithin(panel, dir)) return

      e.preventDefault()
      if (locked.current) return
      step(dir)
    }

    function onKey(e: KeyboardEvent) {
      if (!active()) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const list = sections()
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault(); step(1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault(); step(-1)
      } else if (e.key === 'Home') {
        e.preventDefault(); goTo(0)
      } else if (e.key === 'End') {
        e.preventDefault(); goTo(list.length - 1)
      }
    }

    function onTouchStart(e: TouchEvent) {
      touchY.current = e.touches[0]?.clientY ?? 0
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active()) return
      const endY = e.changedTouches[0]?.clientY ?? 0
      const delta = touchY.current - endY
      if (Math.abs(delta) < 60) return
      const dir = delta > 0 ? 1 : -1
      if (canScrollWithin(sections()[nearest()], dir)) return
      step(dir)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [ids, minWidth, lockMs])
}
