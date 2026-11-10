import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * The storefront is light and the staff CMS is dark. Both are written
 * against the same colour tokens; `theme-admin` on <html> swaps in the dark
 * set (see index.css). The server stamps the class on /admin pages so they
 * paint dark from the first frame — this keeps it right when someone moves
 * between the two without a reload, before the next frame is painted.
 */
export default function ThemeSync() {
  const { pathname } = useLocation()
  const admin = pathname === '/admin' || pathname.startsWith('/admin/')

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('theme-admin', admin)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', admin ? '#0a0c10' : '#ffffff')
  }, [admin])

  return null
}
