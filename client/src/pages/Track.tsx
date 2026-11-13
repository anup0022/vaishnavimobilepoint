import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, Ticket, Phone, RotateCcw, UserCog, Smartphone, CalendarClock, Info, Star,
} from 'lucide-react'
import { api, ApiError, type BookingUpdate } from '@/lib/api'
import { useCaptcha } from '@/lib/useCaptcha'
import { useToast } from '@/components/Toast'
import { googleReviewUrl, useSettings } from '@/lib/useSettings'
import { formatDateTime, mobileDigits, mobileInput } from '@/lib/format'
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
  const [params] = useSearchParams()
  // "Track this repair" on the booking confirmation links here with ?ticket=.
  const [ticket, setTicket] = useState(() => (params.get('ticket') || '').toUpperCase().slice(0, 12))
  const [phone, setPhone] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackResult | null>(null)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const mobile = mobileDigits(phone)
    if (!mobile) {
      setError('Enter the 10-digit mobile number you gave us when booking.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const data = await api.post<TrackResult>('/api/track', {
        ticket,
        phone: mobile,
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

  // The result replaces the form further down the page; on a short phone it
  // would otherwise start under the sticky header. scroll-mt clears it.
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [result])

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
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(mobileInput(e.target.value))}
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
              ref={resultRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 scroll-mt-32"
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

                <div className="mt-8 grid gap-5 border-t border-ink-700 pt-7 sm:grid-cols-3">
                  <Detail icon={Smartphone} label="Device" value={result.booking.device} />
                  <Detail icon={UserCog} label="Service" value={result.booking.issue_type} />
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

                  {/* Phones: one stage per row. Six labels side by side at
                      this width overlap into one unreadable run of text. */}
                  <ol className="space-y-3 sm:hidden">
                    {flow.map((status, i) => {
                      const meta = STATUS_META[status]
                      const reached = i <= currentIndex
                      const isCurrent = i === currentIndex
                      return (
                        <li key={status} className="flex items-center gap-3" aria-current={isCurrent ? 'step' : undefined}>
                          <span
                            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${ reached ? 'border-transparent bg-brand-600 text-white' : 'border-ink-700 bg-ink-800 text-mist-500' }`}
                          >
                            {isCurrent && <span className="absolute inset-0 rounded-full bg-brand-500/40 animate-pulse-ring" />}
                            <meta.icon size={15} className="relative" />
                          </span>
                          <span className={`text-sm ${ isCurrent ? 'font-bold text-mist-50' : reached ? 'font-medium text-mist-200' : 'text-mist-500' }`}>
                            {meta.label}
                            {isCurrent && (
                              <>
                                {' '}
                                <span className="ml-1 text-xs font-semibold text-brand-700">Now</span>
                              </>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ol>

                  <div className="hidden items-center sm:flex">
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
                  <div className="hidden h-14 sm:block" />
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
                        <p className="mt-2.5 text-sm leading-relaxed text-mist-200 [overflow-wrap:anywhere]">{update.note}</p>
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
                    Collect it from the counter Monday to Saturday, {settings.hours_weekday}, or on Sunday,{' '}
                    {settings.hours_sunday}. Please carry this ticket
                    number and a photo ID.
                  </p>
                </motion.div>
              )}

              {/*
                A finished repair is the moment customers are most likely to
                leave a review, and the shop's Google listing had one review
                against neighbours with dozens to thousands. Asked of every
                customer, good experience or bad: Google's rules forbid
                inviting only the happy ones.
              */}
              {(result.booking.status === 'ready' || result.booking.status === 'delivered') &&
                googleReviewUrl(settings) && (
                  <p className="mt-6 text-center text-sm text-mist-400">
                    How did we do?{' '}
                    <a
                      href={googleReviewUrl(settings)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
                    >
                      <Star size={14} /> Review us on Google
                    </a>{' '}
                    — it takes a minute and helps other people in Ranchi decide.
                  </p>
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
