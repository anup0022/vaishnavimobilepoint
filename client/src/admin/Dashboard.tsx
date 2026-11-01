import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Boxes, IndianRupee, Wrench, AlertTriangle, Star, Mail, ArrowRight, ArrowDownRight, ArrowUpRight, Settings2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { money, formatDateTime, timeAgo } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'
import Counter from '@/components/Counter'
import { AdminHeader } from './AdminLayout'

interface Stats {
  stock: { items: number; units: number; value: number }
  lowStock: { id: number; name: string; sku: string; stock_qty: number; low_stock: number }[]
  bookingsByStatus: { status: string; n: number }[]
  openBookings: number
  pendingReviews: number
  unreadMessages: number
  recentBookings: { id: number; ticket: string; customer_name: string; device_brand: string; device_model: string; issue_type: string; status: string; created_at: string }[]
  recentMovements: { id: number; kind: string; qty: number; balance: number; note: string; actor: string; created_at: string; product_name: string }[]
  topCategories: { category: string; items: number; units: number }[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get<Stats>('/api/admin/stats').then(setStats).catch(() => {})
  }, [])

  if (!stats) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'Items in catalogue', value: stats.stock.items, icon: Boxes, tone: 'bg-brand-600/8 text-brand-700', to: '/admin/stock' },
    { label: 'Units in stock', value: stats.stock.units, icon: Boxes, tone: 'bg-brand-600/8 text-brand-600', to: '/admin/stock' },
    { label: 'Open repair tickets', value: stats.openBookings, icon: Wrench, tone: 'bg-warn/8 text-warn', to: '/admin/bookings' },
    { label: 'Low stock alerts', value: stats.lowStock.length, icon: AlertTriangle, tone: 'bg-danger/8 text-danger', to: '/admin/stock' },
  ]

  const maxUnits = Math.max(1, ...stats.topCategories.map((c) => c.units))

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        subtitle="Everything that needs your attention today, in one place."
      />

      {/* headline numbers */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
          >
            <Link
              to={card.to}
              className={`group block rounded-3xl border border-ink-700 ${card.tone} p-6 transition-all hover:-translate-y-1 active:scale-[0.985] hover:border-ink-600`}
            >
              <div className="mb-4 flex items-center justify-between">
                <card.icon size={22} />
                <ArrowRight size={16} className="text-mist-500 transition-transform group-hover:translate-x-1" />
              </div>
              <div className="font-display text-4xl font-bold text-mist-50">
                <Counter value={card.value} duration={1100} />
              </div>
              <div className="mt-1.5 text-sm text-mist-400">{card.label}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* stock value + queues */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl border border-ink-700 bg-ink-900 lift p-7 lg:col-span-2"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-mist-400">
                <IndianRupee size={15} className="text-success" /> Stock value at selling price
              </div>
              <div className="mt-3 font-display text-4xl font-extrabold text-brand-600">{money(stats.stock.value)}</div>
              <p className="mt-2 text-xs text-mist-500">
                {stats.stock.units} units across {stats.stock.items} catalogue items.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {stats.topCategories.map((cat) => (
              <div key={cat.category}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="capitalize text-mist-300">{cat.category}</span>
                  <span className="text-mist-500">
                    {cat.units} units &middot; {cat.items} items
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                  <motion.div
                    className="h-full rounded-full bg-brand-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.units / maxUnits) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-5"
        >
          <Link
            to="/admin/reviews"
            className="flex items-center gap-4 rounded-3xl border border-ink-700 bg-ink-900 lift p-6 transition hover:border-warn/40"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warn/15 text-warn">
              <Star size={21} />
            </span>
            <div>
              <div className="font-display text-2xl font-bold">{stats.pendingReviews}</div>
              <div className="text-sm text-mist-400">Reviews awaiting approval</div>
            </div>
          </Link>

          <Link
            to="/admin/messages"
            className="flex items-center gap-4 rounded-3xl border border-ink-700 bg-ink-900 lift p-6 transition hover:border-brand-500/40"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-600">
              <Mail size={21} />
            </span>
            <div>
              <div className="font-display text-2xl font-bold">{stats.unreadMessages}</div>
              <div className="text-sm text-mist-400">Unread customer messages</div>
            </div>
          </Link>

          <Link
            to="/admin/settings"
            className="flex items-center gap-4 rounded-3xl border border-ink-700 bg-ink-900 lift p-6 transition hover:border-brand-700/40"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/15 text-brand-700">
              <Settings2 size={21} />
            </span>
            <div>
              <div className="font-semibold">Edit site content</div>
              <div className="text-sm text-mist-400">Phone, address, hours, offers</div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* low stock */}
      {stats.lowStock.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 rounded-3xl border border-danger/30 bg-danger/8 p-7"
        >
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-danger">
            <AlertTriangle size={18} /> Reorder these
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.lowStock.map((item) => (
              <Link
                key={item.id}
                to="/admin/stock"
                className="flex items-center justify-between gap-3 rounded-2xl border border-ink-700 bg-ink-900 lift p-4 transition hover:border-danger/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{item.name}</div>
                  <div className="text-xs text-mist-500">{item.sku}</div>
                </div>
                <span
                  className={`chip shrink-0 border ${ item.stock_qty === 0 ? 'border-danger/50 bg-danger/15 text-danger' : 'border-warn/50 bg-warn/15 text-warn' }`}
                >
                  {item.stock_qty} left
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* recent activity */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl border border-ink-700 bg-ink-900 lift p-7"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Latest repair tickets</h2>
            <Link to="/admin/bookings" className="text-sm text-brand-600 hover:underline">
              See all
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentBookings.length === 0 && <p className="text-sm text-mist-500">No tickets yet.</p>}
            {stats.recentBookings.map((booking) => (
              <Link
                key={booking.id}
                to="/admin/bookings"
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-700 bg-ink-850 lift p-4 transition hover:border-brand-700/40"
              >
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold">{booking.ticket}</div>
                  <div className="truncate text-xs text-mist-400">
                    {booking.customer_name} &middot; {booking.device_brand} {booking.device_model}
                  </div>
                  <div className="mt-0.5 text-[11px] text-mist-500">{formatDateTime(booking.created_at)}</div>
                </div>
                <StatusBadge status={booking.status} size="sm" />
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-3xl border border-ink-700 bg-ink-900 lift p-7"
        >
          <h2 className="mb-6 font-display text-lg font-bold">Recent stock movements</h2>
          <div className="space-y-3">
            {stats.recentMovements.map((move) => {
              const positive = move.qty > 0
              return (
                <div key={move.id} className="flex items-start gap-3 rounded-2xl border border-ink-700 bg-ink-850 lift p-4">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ positive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger' }`}
                  >
                    {positive ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{move.product_name}</div>
                    <div className="truncate text-xs text-mist-400">{move.note}</div>
                    <div className="mt-0.5 text-[11px] text-mist-500">
                      {timeAgo(move.created_at)} &middot; by {move.actor}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-sm font-bold ${positive ? 'text-success' : 'text-danger'}`}>
                      {positive ? '+' : ''}{move.qty}
                    </div>
                    <div className="text-[11px] text-mist-500">→ {move.balance}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
