import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, SlidersHorizontal, X, PackageSearch } from 'lucide-react'
import { api, type Product } from '@/lib/api'
import { CATEGORY_LABELS } from '@/lib/format'
import ProductCard from '@/components/ProductCard'
import Reveal from '@/components/Reveal'
import { shopPhoto } from '@/lib/images'

interface Facets {
  categories: { category: string; n: number }[]
  brands: { brand: string; n: number }[]
}

const SORTS = [
  { value: 'featured', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
]

export default function Products() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [facets, setFacets] = useState<Facets>({ categories: [], brands: [] })
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const category = params.get('category') || 'all'
  const brand = params.get('brand') || 'all'
  const sort = params.get('sort') || 'featured'
  const [search, setSearch] = useState(params.get('q') || '')

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (search) next.set('q', search)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 350)
    return () => clearTimeout(timer)
  }, [search, setParams])

  const query = useMemo(() => {
    const q = new URLSearchParams()
    if (category !== 'all') q.set('category', category)
    if (brand !== 'all') q.set('brand', brand)
    if (sort) q.set('sort', sort)
    const term = params.get('q')
    if (term) q.set('q', term)
    return q.toString()
  }, [category, brand, sort, params])

  useEffect(() => {
    setLoading(true)
    setFailed(false)
    api
      .get<{ products: Product[]; facets: Facets }>(`/api/products?${query}`)
      .then((d) => {
        setProducts(d.products)
        setFacets(d.facets)
      })
      // A failed request is not an empty shop: say so and offer a retry,
      // instead of "0 items in store" and "Nothing matches that".
      .catch(() => {
        setProducts([])
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [query, attempt])

  function update(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'all' || !value) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const activeFilters = [category !== 'all', brand !== 'all', !!params.get('q')].filter(Boolean).length

  // The top padding was 64px to clear the page heading that used to sit here.
  // The header is sticky rather than fixed, so it already takes up flow space
  // and the banner needs no extra room above it.
  return (
    <div className="relative px-4 pb-24 pt-6 sm:px-6">

      <div className="relative mx-auto max-w-7xl">
        {/* The visible heading was removed, but a page still needs one: screen
            readers use it to announce where they are, and search engines use
            it as the page's title in results. Kept off-screen rather than
            deleted. */}
        <h1 className="sr-only">Catalogue — phones, accessories and audio in stock at Vaishnavi Mobile Point, Ranchi</h1>

        <Reveal delay={0.08}>
          {/* Full-bleed banner band. The box matches the artwork's own 1680x640
              ratio, so the whole banner is visible at every width rather than
              being cropped to a fixed height. Swap the file at this path to
              change the banner. */}
          <div className="full-bleed overflow-hidden border-y border-ink-700">
            <img
              {...shopPhoto('/shop/banner-wide.jpg')}
              sizes="100vw"
              alt="Vaishnavi Mobile Point — smartphones, headphones and accessories"
              className="aspect-[1680/640] w-full object-cover object-center"
              width={1680}
              height={640}
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
              <input
                className="field pl-12"
                placeholder="Search by model, brand or feature…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search products"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 transition hover:text-brand-700"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <select
              className="field w-auto min-w-[180px]"
              value={sort}
              onChange={(e) => update('sort', e.target.value)}
              aria-label="Sort products"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className="btn-ghost relative px-5 py-3 lg:hidden"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal size={17} /> Filters
              {activeFilters > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[250px_1fr]">
          {/* filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            {/* Screen-reader outline: the page's h1, then these, then the h3s
                of the filter groups and products — no level skipped. */}
            <h2 className="sr-only">Filters</h2>
            <div className="sticky top-28 space-y-8 rounded-3xl border border-ink-700 bg-ink-850 lift p-6">
              <FilterGroup
                title="Category"
                options={[
                  { value: 'all', label: 'Everything', count: facets.categories.reduce((a, c) => a + c.n, 0) },
                  ...facets.categories.map((c) => ({
                    value: c.category,
                    label: CATEGORY_LABELS[c.category] || c.category,
                    count: c.n,
                  })),
                ]}
                current={category}
                onSelect={(v) => update('category', v)}
              />

              <FilterGroup
                title="Brand"
                options={[
                  { value: 'all', label: 'All brands', count: facets.brands.reduce((a, b) => a + b.n, 0) },
                  ...facets.brands.map((b) => ({ value: b.brand, label: b.brand, count: b.n })),
                ]}
                current={brand}
                onSelect={(v) => update('brand', v)}
              />

              {activeFilters > 0 && (
                <button
                  onClick={() => {
                    setSearch('')
                    setParams({}, { replace: true })
                  }}
                  className="w-full rounded-xl border border-ink-700 py-2.5 text-sm font-semibold text-mist-400 transition hover:border-brand-600/45 hover:text-brand-700"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          {/* grid */}
          <div>
            <h2 className="sr-only">Products</h2>
            <p className="mb-6 text-sm text-mist-500">
              {loading ? 'Loading…' : failed ? ' ' : `${products.length} item${products.length === 1 ? '' : 's'} in store`}
            </p>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shimmer h-96 rounded-3xl" />
                ))}
              </div>
            ) : failed ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-600 py-24 text-center">
                <PackageSearch size={44} className="mb-5 text-mist-500" />
                <h3 className="mb-2 text-xl font-bold">We could not load the catalogue</h3>
                <p className="mb-6 max-w-sm text-sm text-mist-400">
                  The connection dropped or the server is busy. Please try again.
                </p>
                <button onClick={() => setAttempt((n) => n + 1)} className="btn-primary">
                  Try again
                </button>
              </div>
            ) : products.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-600 py-24 text-center"
              >
                <PackageSearch size={44} className="mb-5 text-mist-500" />
                <h3 className="mb-2 text-xl font-bold">Nothing matches that</h3>
                <p className="max-w-sm text-sm text-mist-400">
                  Try a different brand or clear the filters. If you want a model we don't stock, call us — we can
                  usually arrange it within 48 hours.
                </p>
              </motion.div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {products.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterGroup({
  title,
  options,
  current,
  onSelect,
}: {
  title: string
  options: { value: string; label: string; count: number }[]
  current: string
  onSelect: (value: string) => void
}) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-mist-400">{title}</h3>
      <div className="space-y-1">
        {options.map((opt) => {
          const active = current === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${ active ? 'bg-brand-600/15 font-semibold text-brand-700' : 'text-mist-400 hover:bg-ink-800 hover:text-mist-50' }`}
            >
              <span>{opt.label}</span>
              <span className={`text-xs ${active ? 'text-brand-700' : 'text-mist-500'}`}>{opt.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
