import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Trash2, Save, Phone, Mail, Smartphone, FileText, Send } from 'lucide-react'
import { api, ApiError, type Booking, type BookingUpdate } from '@/lib/api'
import { formatDateTime, timeAgo } from '@/lib/format'
import { useToast } from '@/components/Toast'
import StatusBadge, { STATUS_META } from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { AdminHeader } from './AdminLayout'

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'all', label: 'All' },
  { value: 'received', label: 'Received' },
  { value: 'diagnosing', label: 'Diagnosing' },
  { value: 'awaiting_parts', label: 'Awaiting parts' },
  { value: 'repairing', label: 'Repairing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
]

const ALL_STATUSES = ['received', 'diagnosing', 'awaiting_parts', 'repairing', 'ready', 'delivered', 'cancelled']

export default function Bookings() {
  const toast = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Booking | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Booking | null>(null)

  function load() {
    setLoading(true)
    const params = new URLSearchParams({ status: filter })
    if (search) params.set('q', search)
    api
      .get<{ bookings: Booking[] }>(`/api/admin/bookings?${params}`)
      .then((d) => setBookings(d.bookings))
      .catch((e: ApiError) => toast.push(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 320 : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search])

  async function remove(booking: Booking) {
    try {
      const r = await api.del<{ message: string }>(`/api/admin/bookings/${booking.id}`)
      toast.push(r.message, 'success')
      setConfirmDelete(null)
      load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Delete failed.', 'error')
    }
  }

  return (
    <div>
      <AdminHeader
        title="Repair tickets"
        subtitle="Every status change you save here appears instantly on the customer's tracking page."
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative min-w-[240px] flex-1">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist-500" />
          <input
            className="field pl-11"
            placeholder="Search ticket, name, phone or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${ filter === f.value ? 'bg-brand-600 text-white' : 'border border-ink-700 bg-ink-800 text-mist-400 hover:text-mist-50' }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-44 rounded-3xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-600 py-20 text-center">
          <p className="text-mist-400">No tickets in this view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bookings.map((booking, i) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="flex min-w-0 flex-col rounded-3xl border border-ink-700 bg-ink-900 lift p-6 transition hover:border-brand-600/45"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-bold">{booking.ticket}</div>
                  <div className="text-xs text-mist-500">{formatDateTime(booking.created_at)}</div>
                </div>
                <StatusBadge status={booking.status} size="sm" />
              </div>

              <dl className="mb-5 space-y-2 text-sm">
                <Row icon={Smartphone} value={`${booking.device_brand} ${booking.device_model}`} />
                <Row icon={FileText} value={booking.issue_type} />
                {/* Number first: a long name truncates, the number never does. */}
                <Row icon={Phone} value={`${booking.phone} · ${booking.customer_name}`} />
              </dl>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-700 pt-4">
                <span className="text-sm text-mist-500" title={formatDateTime(booking.updated_at)}>
                  Updated {timeAgo(booking.updated_at)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(booking)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 text-mist-400 transition hover:border-danger/50 hover:text-danger"
                    aria-label="Delete ticket"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button onClick={() => setActive(booking)} className="btn-primary px-4 py-2 text-xs">
                    Manage
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {active && (
          <TicketModal
            booking={active}
            onClose={() => setActive(null)}
            onSaved={() => {
              setActive(null)
              load()
            }}
          />
        )}
        {confirmDelete && (
          <Modal onClose={() => setConfirmDelete(null)} title="Delete this ticket?">
            <p className="text-sm leading-relaxed text-mist-300">
              Ticket <span className="font-semibold text-mist-50">{confirmDelete.ticket}</span> and its whole timeline
              will be removed. The customer will no longer be able to track it.
            </p>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost px-5 py-2.5 text-sm">
                Keep it
              </button>
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

function Row({ icon: Icon, value }: { icon: typeof Phone; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 text-mist-300">
      <Icon size={14} className="shrink-0 text-mist-500" />
      <span className="min-w-0 truncate">{value}</span>
    </div>
  )
}

function TicketModal({
  booking, onClose, onSaved,
}: {
  booking: Booking; onClose: () => void; onSaved: () => void
}) {
  const toast = useToast()
  const [updates, setUpdates] = useState<BookingUpdate[]>([])
  const [status, setStatus] = useState(booking.status)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get<{ updates: BookingUpdate[] }>(`/api/admin/bookings/${booking.id}`)
      .then((d) => setUpdates(d.updates))
      .catch(() => {})
  }, [booking.id])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const r = await api.patch<{ message: string }>(
        `/api/admin/bookings/${booking.id}`,
        // Send a status only if it was picked here, so a note added from a
        // dialog opened before someone else moved the ticket cannot move it back.
        status !== booking.status ? { status, note } : { note },
      )
      toast.push(r.message, 'success')
      onSaved()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Could not update.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title={`Ticket ${booking.ticket}`} wide>
      <div className="mb-7 grid gap-5 rounded-2xl border border-ink-700 bg-ink-850 lift p-5 sm:grid-cols-2">
        <Detail label="Customer" value={booking.customer_name} />
        <Detail label="Mobile" value={booking.phone} icon={Phone} href={`tel:${booking.phone}`} />
        <Detail label="Device" value={`${booking.device_brand} ${booking.device_model}`} />
        <Detail label="Service" value={booking.issue_type} />
        {booking.imei && <Detail label="IMEI" value={booking.imei} />}
        {booking.email && <Detail label="Email" value={booking.email} icon={Mail} href={`mailto:${booking.email}`} />}
        {booking.issue_desc && (
          <div className="sm:col-span-2">
            <div className="mb-1 text-xs uppercase tracking-wider text-mist-500">Reported problem</div>
            <p className="text-sm leading-relaxed text-mist-200">{booking.issue_desc}</p>
          </div>
        )}
      </div>

      <form onSubmit={save} className="space-y-5">
        <div>
          <label className="label">Status</label>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((value) => {
              const meta = STATUS_META[value]
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  aria-pressed={status === value}
                  className={`flex min-h-10 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${ status === value ? meta.chip : 'border-ink-700 bg-ink-800 text-mist-400 hover:text-mist-50' }`}
                >
                  <meta.icon size={13} />
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ticket-note">Note for the customer</label>
          <textarea
            id="ticket-note"
            className="field min-h-24 resize-y"
            value={note}
            maxLength={1200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Shown on the tracking page. e.g. Display assembly confirmed faulty, original part ordered."
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-ink-700 pt-6">
          <button type="button" onClick={onClose} className="btn-ghost px-5 py-2.5 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm">
            <Save size={16} /> {saving ? 'Saving…' : 'Update status'}
          </button>
        </div>
      </form>

      <div className="mt-8 border-t border-ink-700 pt-7">
        <h3 className="mb-5 flex items-center gap-2 font-display text-base font-bold">
          <Send size={15} className="text-brand-700" /> Timeline the customer sees
        </h3>
        <ol className="space-y-4 border-l border-ink-700 pl-6">
          {updates.map((update, i) => {
            const meta = STATUS_META[update.status] ?? STATUS_META.received
            return (
              <li key={i} className="relative">
                <span className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-ink-900 ${meta.dot}`} />
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={update.status} size="sm" />
                  <span className="text-xs text-mist-500">{formatDateTime(update.created_at)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mist-300 [overflow-wrap:anywhere]">{update.note}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </Modal>
  )
}

function Detail({
  label, value, icon: Icon, href,
}: {
  label: string; value: string; icon?: typeof Phone; href?: string
}) {
  const content = (
    <span className="flex items-center gap-2 font-semibold text-mist-50">
      {Icon && <Icon size={14} className="text-mist-500" />}
      {value}
    </span>
  )
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-mist-500">{label}</div>
      {href ? (
        <a href={href} className="transition hover:text-brand-700">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  )
}
