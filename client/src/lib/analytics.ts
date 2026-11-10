import { analyticsId } from './pageMeta'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/*
 * Google Analytics 4, loaded only when the server has a measurement ID
 * (GA_MEASUREMENT_ID). The bootstrap Google's snippet runs inline lives here
 * instead, because the CSP allows no inline script.
 *
 * Page views are sent by hand, after each route has set its own title: GA's
 * automatic "page changes based on browser history events" fires on the
 * URL change, before the new title exists, and would file every page under
 * the previous one's name. Switch that option off in the GA web stream.
 */
let started = false

function start(): boolean {
  if (started) return true
  if (!analyticsId) return false
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, not an array copy.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', analyticsId, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`
  document.head.appendChild(script)
  started = true
  return true
}

export function trackPageView() {
  if (!start()) return
  window.gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
  })
}
