import { Link } from 'react-router-dom'
import { ArrowUpRight, CircleAlert } from 'lucide-react'
import { useShopData } from '@/lib/data'

const CARDS = [
  {
    slug: 'counter',
    name: 'Counter',
    tag: 'Premium · editorial',
    blurb: 'Seamless paper, no cards, no glass. Chapters invert light to dark as you scroll. The product is the only thing on the page.',
    swatches: ['#fbfbfd', '#08090b', '#6e7079', '#0b4791'],
    deps: 'No new dependency',
    note: 'Quietest. Best for flagships, least like a busy shop.',
  },
  {
    slug: 'bench',
    name: 'Bench',
    tag: 'Cinematic · 3D',
    blurb: 'Dark studio, warm key and cold rim light. Scroll pins each scene; the phone separates into repairable layers priced from your real service list.',
    swatches: ['#0a0c10', '#f0a54a', '#2a7de1', '#35e0a1'],
    deps: 'Adds GSAP + ScrollTrigger (~45 KB gz)',
    note: 'Most impressive. Heaviest on a budget Android.',
  },
  {
    slug: 'dukaan',
    name: 'Dukaan',
    tag: 'Retail · app-like',
    blurb: 'Bento tiles, bilingual, bottom tab bar. Live open/closed status, inline ticket tracking, WhatsApp reserve straight from the card.',
    swatches: ['#f6f7fb', '#1557d0', '#f6a609', '#0e8a5f'],
    deps: 'No new dependency',
    note: 'Fastest and most likely to convert. Least "luxury".',
  },
] as const

export default function Compare() {
  const { products, stats, error, loading } = useShopData()

  return (
    <div className="min-h-screen bg-[#0d1016] px-5 pb-28 pt-12 text-white sm:px-8">
      <header className="mx-auto max-w-6xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
          Vaishnavi Mobile Point · design exploration
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-counter)] text-4xl font-extrabold tracking-tight sm:text-5xl">
          Three directions, all running live
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
          Each preview is a working React app reading your real catalogue, reviews and shop photographs through the
          container on <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">:8470</code>. Nothing here
          touches the live site.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          {error ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 font-semibold text-amber-300">
              <CircleAlert size={13} /> Shop API unreachable — start the container on :8470
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {loading ? 'Loading real data…' : `${products.length} real products · ${stats?.brands ?? 0} brands · ${stats?.rating ?? 0}★`}
            </span>
          )}
          <span className="rounded-full border border-white/15 px-3 py-1.5 text-white/50">
            Gallery frames are placeholder re-crops — one photo per product in the DB
          </span>
        </div>
      </header>

      <div className="mx-auto mt-12 grid max-w-6xl gap-7 lg:grid-cols-3">
        {CARDS.map((card) => (
          <section
            key={card.slug}
            className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-counter)] text-2xl font-bold">{card.name}</h2>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{card.tag}</p>
              </div>
              <div className="flex gap-1 pt-1">
                {card.swatches.map((s) => (
                  <span
                    key={s}
                    className="h-5 w-5 rounded-full border border-white/20"
                    style={{ background: s }}
                    title={s}
                  />
                ))}
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-white/60">{card.blurb}</p>

            {/* A live 390px render, scaled to fit the column. Absolute keeps the
                390px iframe out of layout, so it cannot widen the grid track on
                a narrow screen. */}
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black">
              <div className="relative h-[420px] w-full overflow-hidden">
                <iframe
                  title={`${card.name} mobile preview`}
                  src={`/${card.slug}?bare=1`}
                  className="absolute left-0 top-0 h-[840px] w-[390px] origin-top-left border-0 bg-white"
                  style={{ transform: 'scale(0.5)' }}
                  loading="lazy"
                />
              </div>
            </div>

            <dl className="mt-5 space-y-2 text-[12px]">
              <div className="flex gap-2">
                <dt className="shrink-0 text-white/40">Cost</dt>
                <dd className="text-white/75">{card.deps}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-white/40">Trade-off</dt>
                <dd className="text-white/75">{card.note}</dd>
              </div>
            </dl>

            <Link
              to={`/${card.slug}`}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0d1016] transition hover:bg-white/90"
            >
              Open {card.name} <ArrowUpRight size={16} />
            </Link>
          </section>
        ))}
      </div>

      <footer className="mx-auto mt-14 max-w-6xl rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-[13px] leading-relaxed text-white/50">
        <strong className="text-white/80">To choose:</strong> open each one, use the rail at the bottom to switch
        between them and to flip between desktop and a real 390&nbsp;px handset frame. Click any product to see the
        detail view and gallery. Then tell me which direction to implement — nothing is applied to the live site until
        you say so.
      </footer>
    </div>
  )
}
