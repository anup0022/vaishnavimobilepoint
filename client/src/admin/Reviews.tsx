import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, Check, EyeOff, Trash2, Clock } from 'lucide-react'
import { api, ApiError, type Review } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useToast } from '@/components/Toast'
import SmartImage from '@/components/SmartImage'
import Modal from '@/components/Modal'
import { AdminHeader } from './AdminLayout'

export default function Reviews() {
  const toast = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'published' | 'all'>('pending')
  const [confirmDelete, setConfirmDelete] = useState<Review | null>(null)

  function load() {
    setLoading(true)
    api
      .get<{ reviews: Review[] }>('/api/admin/feedback')
      .then((d) => setReviews(d.reviews))
      .catch((e: ApiError) => toast.push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function setApproved(review: Review, approved: boolean) {
    try {
      const r = await api.patch<{ message: string }>(`/api/admin/feedback/${review.id}`, { approved })
      toast.push(r.message, 'success')
      load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Could not update.', 'error')
    }
  }

  async function remove(review: Review) {
    try {
      const r = await api.del<{ message: string }>(`/api/admin/feedback/${review.id}`)
      toast.push(r.message, 'success')
      setConfirmDelete(null)
      load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Delete failed.', 'error')
    }
  }

  const pending = reviews.filter((r) => !r.approved)
  const shown = tab === 'pending' ? pending : tab === 'published' ? reviews.filter((r) => r.approved) : reviews

  const TABS = [
    { value: 'pending' as const, label: `Awaiting approval (${pending.length})` },
    { value: 'published' as const, label: 'Published' },
    { value: 'all' as const, label: 'All' },
  ]

  return (
    <div>
      <AdminHeader
        title="Customer reviews"
        subtitle="Nothing appears on the public reviews page until you approve it here."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${ tab === t.value ? 'bg-brand-600 text-white' : 'border border-ink-700 bg-ink-800 text-mist-400 hover:text-mist-50' }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-48 rounded-3xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-600 py-20 text-center">
          <p className="text-mist-400">
            {tab === 'pending' ? 'Nothing waiting for approval. Inbox zero.' : 'No reviews in this view.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((review, i) => (
            <motion.article
              key={review.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className={`rounded-3xl border p-6 ${ review.approved ? 'border-ink-700 bg-ink-900 lift' : 'border-warn/30 bg-warn/5' }`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <SmartImage
                    src={review.avatar_url}
                    alt=""
                    seed={String(review.id)}
                    className="h-11 w-11 shrink-0 rounded-full border border-ink-700"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{review.name}</div>
                    <div className="truncate text-xs text-mist-500">
                      {review.city}
                      {review.service && ` · ${review.service}`}
                    </div>
                  </div>
                </div>
                {review.approved ? (
                  <span className="chip border border-success/40 bg-success/10 text-success">
                    <Check size={12} /> Published
                  </span>
                ) : (
                  <span className="chip border border-warn/40 bg-warn/10 text-warn">
                    <Clock size={12} /> Pending
                  </span>
                )}
              </div>

              <div className="mb-3 flex items-center gap-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      size={14}
                      className={s < review.rating ? 'text-warn' : 'text-ink-600'}
                      fill={s < review.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <span className="text-xs text-mist-500">{formatDateTime(review.created_at)}</span>
              </div>

              {review.title && <h3 className="mb-2 font-display text-base font-bold">{review.title}</h3>}
              <p className="mb-5 text-sm leading-relaxed text-mist-300">{review.message}</p>

              <div className="flex flex-wrap justify-end gap-2 border-t border-ink-700 pt-4">
                <button
                  onClick={() => setConfirmDelete(review)}
                  className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-3.5 py-2 text-xs font-semibold text-mist-400 transition hover:border-danger/50 hover:text-danger"
                >
                  <Trash2 size={14} /> Delete
                </button>
                {review.approved ? (
                  <button
                    onClick={() => setApproved(review, false)}
                    className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-3.5 py-2 text-xs font-semibold text-mist-400 transition hover:text-mist-50"
                  >
                    <EyeOff size={14} /> Unpublish
                  </button>
                ) : (
                  <button onClick={() => setApproved(review, true)} className="btn-primary px-4 py-2 text-xs">
                    <Check size={14} /> Approve &amp; publish
                  </button>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete && (
          <Modal onClose={() => setConfirmDelete(null)} title="Delete this review?">
            <p className="text-sm leading-relaxed text-mist-300">
              The review by <span className="font-semibold text-mist-50">{confirmDelete.name}</span> will be removed
              permanently.
            </p>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost px-5 py-2.5 text-sm">Keep it</button>
              <button
                onClick={() => remove(confirmDelete)}
                className="rounded-[0.7rem] bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/90"
              >
                Delete permanently
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
