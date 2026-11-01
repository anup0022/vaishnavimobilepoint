import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MessageSquareQuote, Send, CheckCircle2, Filter } from 'lucide-react'
import { api, ApiError, type Review } from '@/lib/api'
import { useCaptcha } from '@/lib/useCaptcha'
import { useToast } from '@/components/Toast'
import { timeAgo } from '@/lib/format'
import CaptchaBox from '@/components/CaptchaBox'
import SmartImage from '@/components/SmartImage'
import Reveal from '@/components/Reveal'
import Counter from '@/components/Counter'
import Magnetic from '@/components/Magnetic'

const SERVICES = [
  'New Phone Purchase', 'Screen Replacement', 'Battery Replacement', 'Charging Port Repair',
  'Water Damage Repair', 'Motherboard Repair', 'Software / Data Recovery', 'Accessories',
  'Exchange / Trade-in', 'Other',
]

interface FeedbackData {
  reviews: Review[]
  total: number
  average: number
  breakdown: { rating: number; n: number }[]
}

export default function Feedback() {
  const toast = useToast()
  const captcha = useCaptcha()
  const [data, setData] = useState<FeedbackData | null>(null)
  const [filter, setFilter] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', city: 'Ranchi', rating: 5, title: '', message: '', service: '' })

  function load() {
    api.get<FeedbackData>('/api/feedback').then(setData).catch(() => {})
  }

  useEffect(load, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await api.post<{ message: string }>('/api/feedback', {
        ...form,
        captchaId: captcha.id,
        captchaText: captcha.text,
      })
      setSubmitted(true)
      toast.push(result.message, 'success')
      setForm({ name: '', city: 'Ranchi', rating: 5, title: '', message: '', service: '' })
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Could not send your review.', 'error')
    } finally {
      captcha.refresh()
      setSubmitting(false)
    }
  }

  const reviews = data?.reviews ?? []
  const shown = filter ? reviews.filter((r) => r.rating === filter) : reviews
  const counts = new Map((data?.breakdown ?? []).map((b) => [b.rating, b.n]))

  return (
    <div className="relative px-4 pb-24 pt-16 sm:px-6">

      <div className="relative mx-auto max-w-6xl">
        <Reveal className="text-center">
          <span className="chip border border-warn/30 bg-warn/10 text-warn">
            <MessageSquareQuote size={13} /> Customer feedback
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold sm:text-6xl">
            What Ranchi <span className="text-brand-600">says about us</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-mist-400">
            Unedited reviews left on this site. We publish the three-star ones too — you should know what you are
            walking into.
          </p>
        </Reveal>

        {/* rating summary */}
        {data && (
          <Reveal delay={0.1}>
            <div className="mt-14 grid gap-8 rounded-[2rem] border border-ink-700 bg-ink-900 lift p-8 sm:p-10 lg:grid-cols-[260px_1fr] lg:items-center">
              <div className="text-center lg:border-r lg:border-ink-700">
                <div className="font-display text-6xl font-extrabold text-mist-50">
                  {data.average.toFixed(1)}
                </div>
                <div className="mt-3 flex justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={i < Math.round(data.average) ? 'text-warn' : 'text-ink-600'}
                      fill={i < Math.round(data.average) ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <div className="mt-3 text-sm text-mist-500">
                  Based on <Counter value={data.total} /> reviews
                </div>
              </div>

              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const n = counts.get(stars) ?? 0
                  const pct = data.total ? (n / data.total) * 100 : 0
                  return (
                    <button
                      key={stars}
                      onClick={() => setFilter(filter === stars ? 0 : stars)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-1 transition ${ filter === stars ? 'bg-warn/10' : 'hover:bg-ink-800' }`}
                    >
                      <span className="flex w-12 items-center gap-1 text-sm text-mist-400">
                        {stars} <Star size={12} className="text-warn" fill="currentColor" />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700">
                        <motion.span
                          className="block h-full rounded-full bg-warn"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </span>
                      <span className="w-8 text-right text-sm text-mist-500">{n}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>
        )}

        {filter > 0 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-mist-400">
            <Filter size={14} />
            Showing {filter}-star reviews only
            <button onClick={() => setFilter(0)} className="font-semibold text-brand-600 hover:underline">
              show all
            </button>
          </div>
        )}

        {/* review grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {shown.map((review, i) => (
              <motion.figure
                layout
                key={review.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
                /* A grid item defaults to min-width:auto, so it can never be
                   narrower than its longest unbreakable word. Reviews are typed
                   by customers — one long token was widening the whole page to
                   404px inside a 390px viewport. */
                className="flex h-full min-w-0 flex-col rounded-3xl border border-ink-700 bg-ink-850 lift p-7 transition-colors hover:border-warn/30"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        size={15}
                        className={s < review.rating ? 'text-warn' : 'text-ink-600'}
                        fill={s < review.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-mist-500">{timeAgo(review.created_at)}</span>
                </div>

                {review.title && (
                  <h3 className="mb-2.5 break-words font-display text-lg font-bold leading-snug">{review.title}</h3>
                )}
                <blockquote className="mb-6 flex-1 break-words text-sm leading-relaxed text-mist-300">
                  {review.message}
                </blockquote>

                <figcaption className="flex items-center gap-3 border-t border-ink-700 pt-5">
                  <SmartImage src={review.avatar_url} alt="" seed={String(review.id)} className="h-11 w-11 shrink-0 rounded-full" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{review.name}</div>
                    <div className="truncate text-xs text-mist-500">
                      {review.city}
                      {review.service && ` · ${review.service}`}
                    </div>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </AnimatePresence>
        </div>

        {/* leave a review */}
        <Reveal delay={0.1}>
          <div className="mt-24 rounded-[2rem] border border-ink-700 bg-ink-900 lift p-8 backdrop-blur sm:p-12">
            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="mx-auto mb-6 flex h-18 w-18 items-center justify-center rounded-3xl bg-success/15 p-5 text-success">
                  <CheckCircle2 size={34} />
                </div>
                <h2 className="font-display text-3xl font-bold">Thank you</h2>
                <p className="mx-auto mt-4 max-w-md leading-relaxed text-mist-400">
                  Your review has gone to the shop for approval and will appear on this page shortly. We read every
                  single one.
                </p>
                <button onClick={() => setSubmitted(false)} className="btn-ghost mt-8">
                  Write another review
                </button>
              </motion.div>
            ) : (
              <>
                <div className="mb-9 text-center">
                  <h2 className="font-display text-3xl font-bold sm:text-4xl">
                    Share your <span className="text-brand-600">experience</span>
                  </h2>
                  <p className="mx-auto mt-4 max-w-lg text-mist-400">
                    Bought a phone or had something repaired? Tell other people in Ranchi how it went.
                  </p>
                </div>

                <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
                  <div>
                    <label className="label">Your rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                          key={star}
                          type="button"
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setForm({ ...form, rating: star })}
                          className="p-1"
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={32}
                            className={star <= form.rating ? 'text-warn' : 'text-ink-600'}
                            fill={star <= form.rating ? 'currentColor' : 'none'}
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="fb-name">Your name *</label>
                      <input
                        id="fb-name" className="field" required value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Priya Sharma"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="fb-city">Area / city</label>
                      <input
                        id="fb-city" className="field" value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="e.g. Lalpur, Ranchi"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="fb-service">What did you come for?</label>
                      <select
                        id="fb-service" className="field" value={form.service}
                        onChange={(e) => setForm({ ...form, service: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {SERVICES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="fb-title">Headline</label>
                      <input
                        id="fb-title" className="field" value={form.title} maxLength={120}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Sum it up in a few words"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="fb-message">Your review *</label>
                    <textarea
                      id="fb-message" className="field min-h-36 resize-y" required minLength={15} value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="What did you come in for, how long did it take, and how was the service?"
                    />
                    <p className="mt-2 text-xs text-mist-500">{form.message.length} characters — minimum 15.</p>
                  </div>

                  <CaptchaBox captcha={captcha} />

                  <Magnetic className="block">
                    <button
                      type="submit"
                      disabled={submitting || form.message.trim().length < 15 || !form.name.trim()}
                      className="btn-primary w-full"
                    >
                      {submitting ? 'Sending…' : 'Submit review'}
                      {!submitting && <Send size={18} />}
                    </button>
                  </Magnetic>

                  <p className="text-center text-xs text-mist-500">
                    Reviews are checked by the shop before they appear, to keep spam off this page.
                  </p>
                </form>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  )
}
