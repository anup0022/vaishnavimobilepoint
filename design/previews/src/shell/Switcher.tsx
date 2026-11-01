import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Monitor, Smartphone, LayoutGrid } from 'lucide-react'

export const CONCEPTS = [
  { slug: 'counter', name: 'Counter', blurb: 'Premium, editorial, Apple-inspired' },
  { slug: 'bench', name: 'Bench', blurb: 'Cinematic 3D, studio-lit, the teardown' },
  { slug: 'dukaan', name: 'Dukaan', blurb: 'Fast bento retail, bilingual, app-like' },
] as const

export type ConceptSlug = (typeof CONCEPTS)[number]['slug']

/**
 * Floating control rail shown over every concept. `?bare=1` removes it, which
 * is how the concept is embedded in the phone frame and captured for review.
 */
export default function Switcher() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const device = params.get('device') === 'mobile' ? 'mobile' : 'desktop'
  const current = location.pathname.replace('/', '')

  function setDevice(next: 'desktop' | 'mobile') {
    const p = new URLSearchParams(params)
    if (next === 'desktop') p.delete('device')
    else p.set('device', 'mobile')
    setParams(p, { replace: true })
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[400] flex justify-center p-3 print:hidden">
      <div className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-white/15 bg-[#0d1016]/92 p-1.5 text-white shadow-2xl backdrop-blur-xl no-sb">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          title="Compare all three"
        >
          <LayoutGrid size={14} />
          <span className="hidden sm:inline">Compare</span>
        </Link>

        <span className="h-6 w-px shrink-0 bg-white/15" />

        {CONCEPTS.map((c) => {
          const active = current === c.slug
          return (
            <Link
              key={c.slug}
              to={{ pathname: `/${c.slug}`, search: params.toString() }}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                active ? 'bg-white text-[#0d1016]' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {c.name}
            </Link>
          )
        })}

        <span className="h-6 w-px shrink-0 bg-white/15" />

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setDevice('desktop')}
            aria-pressed={device === 'desktop'}
            className={`rounded-lg p-2 transition ${device === 'desktop' ? 'bg-white text-[#0d1016]' : 'text-white/70 hover:bg-white/10'}`}
            title="Desktop layout"
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            aria-pressed={device === 'mobile'}
            className={`rounded-lg p-2 transition ${device === 'mobile' ? 'bg-white text-[#0d1016]' : 'text-white/70 hover:bg-white/10'}`}
            title="Mobile layout (390px)"
          >
            <Smartphone size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
