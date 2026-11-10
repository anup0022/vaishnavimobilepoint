import { useId } from 'react'

/**
 * lucide-react v1 removed third-party brand marks, so the brand glyphs the
 * site needs are drawn here instead. Same props shape as a lucide icon
 * (size + className) so they drop straight in.
 *
 * The plain glyphs take the text colour. The `…Logo` versions are the
 * official coloured app marks — WhatsApp's green, Instagram's gradient — for
 * the places a shopper should recognise the brand at a glance.
 */

interface IconProps {
  size?: number
  className?: string
}

/* The WhatsApp handset in its speech bubble (Simple Icons, CC0). */
const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z'

/** WhatsApp's handset-in-a-bubble, in the text colour. */
export function WhatsApp({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className={className} aria-hidden="true" focusable="false"
    >
      <path d={WHATSAPP_PATH} />
    </svg>
  )
}

/** The official WhatsApp mark: the white handset on WhatsApp green. */
export function WhatsAppLogo({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="5.6" fill="#25D366" />
      <path d={WHATSAPP_PATH} fill="#fff" transform="translate(4.5 4.5) scale(0.625)" />
    </svg>
  )
}

/** The official Instagram mark: the white camera on Instagram's gradient. */
export function InstagramLogo({ size = 32, className }: IconProps) {
  // Each copy needs its own gradient id, or every copy on the page would
  // paint with the first one's. React's ids carry «» brackets, which a
  // url(#…) reference has to percent-encode; plain letters and digits
  // resolve the same way in every browser.
  const id = `ig${useId().replace(/[^\w-]/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={id} cx="0.3" cy="1.07" r="1.5">
          <stop offset="0" stopColor="#fdf497" />
          <stop offset="0.05" stopColor="#fdf497" />
          <stop offset="0.45" stopColor="#fd5949" />
          <stop offset="0.6" stopColor="#d6249f" />
          <stop offset="0.9" stopColor="#285aeb" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="5.6" fill={`url(#${id})`} />
      <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="3.9" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="15.85" cy="8.15" r="0.95" fill="#fff" />
    </svg>
  )
}

export function Facebook({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className={className} aria-hidden="true" focusable="false"
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  )
}

export function Instagram({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true" focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Youtube({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className={className} aria-hidden="true" focusable="false"
    >
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26.1 26.1 0 0 0 2 12a26.1 26.1 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26.1 26.1 0 0 0 22 12a26.1 26.1 0 0 0-.4-4.8ZM10 15.02V8.98L15.2 12 10 15.02Z" />
    </svg>
  )
}
