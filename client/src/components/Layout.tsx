import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import Nav from './Nav'
import Footer from './Footer'
import FloatingActions from './FloatingActions'
import { applyPageMeta } from '@/lib/pageMeta'
import { trackPageView } from '@/lib/analytics'

export default function Layout() {
  const location = useLocation()

  // The first page a visitor lands on is shown at once; the fade-in is for
  // moving between pages. Fading the landing page in kept its main content
  // invisible until the script had run and the animation had played, which
  // is what search engines time as the page's load.
  const landing = useRef(true)
  useEffect(() => {
    landing.current = false
  }, [])

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

  // Every storefront page is the white store look: `st` sets its type and
  // colour and scopes the store's styles (components/store/store.css).
  return (
    <div className="st relative min-h-screen bg-white">
      <div className="relative z-10">
        <Nav />
        {/* Keyed on the path so each route replays the enter animation.
            Deliberately no exit animation: with `mode="wait"` the outgoing
            opacity:0 was being left applied to the incoming page, which blanked
            the screen on navigation. */}
        <motion.main
          key={location.pathname}
          initial={landing.current ? false : { opacity: 0, y: 12 }}
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
