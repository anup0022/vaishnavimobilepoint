import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, Ticket, Phone, RotateCcw, IndianRupee, UserCog, Smartphone, CalendarClock, Info,
} from 'lucide-react'
import { api, ApiError, type BookingUpdate } from '@/lib/api'
import { useCaptcha } from '@/lib/useCaptcha'
import { useToast } from '@/components/Toast'
import { useSettings } from '@/lib/useSettings'
import { formatDateTime, money } from '@/lib/format'
import CaptchaBox from '@/components/CaptchaBox'
import StatusBadge, { STATUS_META } from '@/components/StatusBadge'
import Reveal from '@/components/Reveal'
import Magnetic from '@/components/Magnetic'
import TalkToUs, { formsOffline } from '@/components/TalkToUs'

interface TrackedBooking {
  ticket: string
  customer_name: string
  device: string
  issue_type: string
  issue_desc: string
  status: string
  estimate_amount: number
  final_amount: number
  technician: string
  created_at: string
  updated_at: string
}

interface TrackResult {
  booking: TrackedBooking
  updates: BookingUpdate[]
  statusFlow: string[]
}

export default function Track() {
  const settings = useSettings()
  const toast = useToast()
  const captcha = useCaptcha()
  const [ticket, setTicket] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackResult | null>(null)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await api.post<TrackResult>('/api/track', {
        ticket,
        phone,
        captchaId: captcha.id,
        captchaText: captcha.text,
      })
      setResult(data)
      toast.push(`Found repair ${data.booking.ticket}.`, 'success')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not look that up right now.'
      setError(message)
      setResult(null)
      captcha.refresh()
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setError('')
    setTicket('')
    setPhone('')
    captcha.refresh()
  }

  const flow = result?.statusFlow ?? []
  const currentIndex = result ? flow.indexOf(result.booking.status) : -1
  const cancelled = result?.booking.status === 'cancelled'

  return (
    <div className="relative px-4 pb-24 pt-16 sm:px-6">

      <div className="relative mx-auto max-w-3xl">
        <Reveal className="text-center">
          <span className="chip border border-brand-500/30 bg-brand-500/10 text-brand-600">
            <Search size={13} /> Repair status
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold sm:text-6xl">
            Track your <span className="text-brand-600">repair</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-mist-400">
            {formsOffline
              ? 'Send us your ticket number or the mobile number you gave us, and we will tell you exactly where your device is.'
              : 'Enter the ticket number from your booking along with the mobile number you gave us. Both must match before we show any details.'}
          </p>
        </Reveal>

        {formsOffline ? (
          <Reveal delay={0.1} className="mt-12">
            <TalkToUs
              title="Ask us for an update"
              body="We will check the bench and come straight back to you with the stage your repair is at and when it will be ready."
              message="Hi! Could I get an update on my repair? Ticket number: "
            />
          </Reveal>
        ) : (
        <>
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.form
              key="form"
              onSubmit={submit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 space-y-6 rounded-[2rem] border border-ink-700 bg-ink-900 lift p-7 backdrop-blur sm:p-10"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="label flex items-center gap-2" htmlFor="ticket">
                    <Ticket size={14} className="text-brand-700" /> Ticket number
                  </label>
                  <input
                    id="ticket"
                    className="field text-center font-display text-xl font-bold uppercase tracking-widest"
                    value={ticket}
                    onChange={(e) => setTicket(e.target.value.toUpperCase())}
                    placeholder="VMS-XXXXXX"
                    maxLength={12}
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-2" htmlFor="track-phone">
                    <Phone size={14} className="text-brand-700" /> Registered mobile
                  </label>
                  <input
                    id="track-phone"
                    className="field text-center font-display text-xl font-bold tracking-widest"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    required
                    autoComplete="off"
                  />
                </div>
              </div>

              <CaptchaBox captcha={captcha} />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-2xl border border-danger/35 bg-danger/10 p-4 text-sm text-danger"
                  role="alert"
                >
                  <Info size={17} className="mt-0.5 shrink-0" />
                  {error}
                </motion.div>
              )}

              <Magnetic className="block">
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Checking…' : 'Check status'}
                  {!loading && <Search size={18} />}
                </button>
              </Magnetic>

              <p className="text-center text-sm text-mist-500">
                Lost your ticket number? Call{' '}
                <a href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`} className="text-brand-600 hover:underline">
                  {settings.phone_primary}
                </a>{' '}
                with your IMEI and we will find it.
              </p>
            </motion.form>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12"
            >
              {/* summary */}
              <div className="rounded-[2rem] border border-ink-700 bg-ink-900 lift p-7 backdrop-blur sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-mist-500">Ticket</div>
                    <div className="mt-1 font-display text-3xl font-extrabold text-mist-50">{result.booking.ticket}</div>
                    <div className="mt-2 text-sm text-mist-400">
                      Booked by {result.booking.customer_name} &middot; {formatDateTime(result.booking.created_at)}
                    </div>
                  </div>
                  <StatusBadge status={result.booking.status} />
                </div>

                <div className="mt-8 grid gap-5 border-t border-ink-700 pt-7 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail icon={Smartphone} label="Device" value={result.booking.device} />
                  <Detail icon={UserCog} label="Service" value={result.booking.issue_type} />
                  <Detail
                    icon={IndianRupee}
                    label={result.booking.final_amount > 0 ? 'Final amount' : 'Estimate'}
                    value={
                      result.booking.final_amount > 0
                        ? money(result.booking.final_amount)
                        : result.booking.estimate_amount > 0
                          ? money(result.booking.estimate_amount)
                          : 'Pending diagnosis'
                    }
                  />
                  <Detail
                    icon={CalendarClock}
                    label="Last updated"
                    value={formatDateTime(result.booking.updated_at)}
                  />
                </div>

                {result.booking.issue_desc && (
                  <div className="mt-7 rounded-2xl border border-ink-700 bg-ink-800 p-5">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-mist-500">
                      Reported problem
                    </div>
                    <p className="text-sm leading-relaxed text-mist-200">{result.booking.issue_desc}</p>
                  </div>
                )}
              </div>

              {/* progress rail */}
              {!cancelled && (
                <div className="mt-8 rounded-[2rem] border border-ink-700 bg-ink-900 lift p-7 backdrop-blur sm:p-9">
                  <h2 className="mb-8 font-display text-xl font-bold">Repair progress</h2>
                  <div className="flex items-center">
                    {flow.map((status, i) => {
                      const meta = STATUS_META[status]
                      const reached = i <= currentIndex
                      const isCurrent = i === currentIndex
                      return (
                        <div key={status} className="flex flex-1 items-center last:flex-none">
                          <div className="relative flex flex-col items-center">
                            <motion.div
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: Math.min(i * 0.04, 0.3), type: 'spring', stiffness: 260, damping: 18 }}
                              className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 ${ reached ? 'border-transparent bg-brand-600 text-white' : 'border-ink-700 bg-ink-800 text-mist-500' }`}
                            >
                              {isCurrent && (
                                <span className="absolute inset-0 rounded-full bg-brand-500/40 animate-pulse-ring" />
                              )}
                              <meta.icon size={17} className="relative" />
                            </motion.div>
                            <span
                              className={`absolute top-14 w-24 text-center text-[10px] font-medium leading-tight ${ reached ? 'text-mist-200' : 'text-mist-500' }`}
                            >
                              {meta.label}
                            </span>
                          </div>
                          {i < flow.length - 1 && (
                            <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                              <motion.div
                                className="h-full bg-brand-600"
                                initial={{ width: 0 }}
                                animate={{ width: i < currentIndex ? '100%' : '0%' }}
                                transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="h-14" />
                </div>
              )}

              {/* timeline */}
              <div className="mt-8 rounded-[2rem] border border-ink-700 bg-ink-900 lift p-7 backdrop-blur sm:p-9">
                <h2 className="mb-8 font-display text-xl font-bold">What our bench has logged</h2>
                <ol className="relative space-y-7 border-l border-ink-700 pl-8">
                  {result.updates.map((update, i) => {
                    const meta = STATUS_META[update.status] ?? STATUS_META.received
                    const latest = i === result.updates.length - 1
                    return (
                      <motion.li
                        key={`${update.status}-${i}`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + i * 0.1 }}
                        className="relative"
                      >
                        <span
                          className={`absolute -left-[41px] top-1 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-ink-900 ${meta.dot}`}
                        >
                          {latest && <span className={`absolute inset-0 rounded-full ${meta.dot} animate-pulse-ring`} />}
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge status={update.status} size="sm" />
                          <span className="text-xs text-mist-500">{formatDateTime(update.created_at)}</span>
                        </div>
                        <p className="mt-2.5 text-sm leading-relaxed text-mist-200">{update.note}</p>
                      </motion.li>
                    )
                  })}
                </ol>
              </div>

              {result.booking.status === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 rounded-[2rem] border border-success/30 bg-success/10 p-7 text-center"
                >
                  <h3 className="font-display text-2xl font-bold text-success">Your device is ready</h3>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mist-200">
                    Collect it from the counter any day between {settings.hours_weekday}. Please carry this ticket
                    number and a photo ID.
                  </p>
                </motion.div>
              )}

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button onClick={reset} className="btn-ghost">
                  <RotateCcw size={17} /> Track another ticket
                </button>
                <Link to="/contact" className="btn-ghost">
                  <Phone size={17} /> Contact the shop
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
      </div>
    </div>
  )
}

function Detail({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-mist-500">
        <Icon size={13} /> {label}
      </div>
      <div className="font-semibold text-mist-50">{value}</div>
    </div>
  )
}
