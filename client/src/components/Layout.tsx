import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import Nav from './Nav'
import Footer from './Footer'
import { ScrollProgress, CursorGlow, Preloader } from './Chrome'
import FloatingActions from './FloatingActions'
import { applyPageMeta } from '@/lib/pageMeta'
import { trackPageView } from '@/lib/analytics'

export default function Layout() {
  const location = useLocation()

  // Title and description for the page now showing, then the page view, so
  // analytics files it under the right name. Product pages do both once
  // their product has loaded, because only then is the name known.
  useEffect(() => {
    if (/^\/products\/[^/]+/.test(location.pathname)) return
    applyPageMeta(location.pathname)
    trackPageView()
  }, [location.pathname])

  // Every route starts at the top rather than keeping the old scroll offset —
  // unless the URL points at a section, which must win over the reset.
  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1))
      if (target) {
        // Wait for the incoming page to mount before measuring it.
        requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname, location.hash])

  return (
    <div className="relative min-h-screen">
      <Preloader />
      <ScrollProgress />
      <CursorGlow />

      <div className="pointer-events-none fixed inset-0 z-0 grid-lines opacity-60" aria-hidden="true" />

      <div className="relative z-10">
        <Nav />
        {/* Keyed on the path so each route replays the enter animation.
            Deliberately no exit animation: with `mode="wait"` the outgoing
            opacity:0 was being left applied to the incoming page, which blanked
            the screen on navigation. */}
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
        <Footer />
      </div>

      <FloatingActions />
    </div>
  )
}
