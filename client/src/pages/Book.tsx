import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Wrench, User, Smartphone, FileText, CheckCircle2, Copy, ArrowRight, ArrowLeft, Search, PartyPopper,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useCaptcha } from '@/lib/useCaptcha'
import { useToast } from '@/components/Toast'
import { useSettings } from '@/lib/useSettings'
import CaptchaBox from '@/components/CaptchaBox'
import Reveal from '@/components/Reveal'
import Magnetic from '@/components/Magnetic'

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'realme', 'vivo', 'OPPO', 'OnePlus', 'Nothing', 'Motorola', 'Google', 'Nokia', 'Other']

const STEPS = [
  { id: 1, title: 'About you', icon: User },
  { id: 2, title: 'Your device', icon: Smartphone },
  { id: 3, title: 'The problem', icon: FileText },
]

interface Form {
  name: string
  phone: string
  email: string
  deviceBrand: string
  deviceModel: string
  imei: string
  issueType: string
  issueDesc: string
  preferredDate: string
}

const EMPTY: Form = {
  name: '', phone: '', email: '',
  deviceBrand: '', deviceModel: '', imei: '',
  issueType: '', issueDesc: '', preferredDate: '',
}

export default function Book() {
  const settings = useSettings()
  const toast = useToast()
  const captcha = useCaptcha()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(EMPTY)
  const [issueTypes, setIssueTypes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [ticket, setTicket] = useState('')

  useEffect(() => {
    api.get<{ issueTypes: string[] }>('/api/service-options').then((d) => setIssueTypes(d.issueTypes)).catch(() => {})
  }, [])

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function stepValid(which: number) {
    if (which === 1) return form.name.trim().length >= 2 && form.phone.replace(/\D/g, '').length === 10
    if (which === 2) return !!form.deviceBrand && form.deviceModel.trim().length >= 2
    return !!form.issueType
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!stepValid(3)) return

    setSubmitting(true)
    try {
      const result = await api.post<{ ticket: string; message: string }>('/api/bookings', {
        ...form,
        captchaId: captcha.id,
        captchaText: captcha.text,
      })
      setTicket(result.ticket)
      toast.push(result.message, 'success')
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Could not submit the booking.', 'error')
      captcha.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  /* --------------------------- success screen --------------------------- */
  if (ticket) {
    return (
      <div className="relative px-4 py-24 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-2xl rounded-[2rem] border border-brand-600/25 bg-ink-900 lift-lg p-8 text-center backdrop-blur sm:p-14"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 220, damping: 14 }}
            className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600/15 text-brand-600"
          >
            <PartyPopper size={36} />
          </motion.div>

          <h1 className="font-display text-4xl font-extrabold">Booking confirmed</h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-mist-400">
            Thanks {form.name.split(' ')[0]} — our bench has your request. Keep this ticket number safe; you will need
            it, along with your mobile number, to track the repair.
          </p>

          <div className="my-9 rounded-2xl border border-dashed border-brand-600/35 bg-brand-600/5 p-7">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist-400">Your ticket number</div>
            <div className="font-display text-4xl font-extrabold tracking-tight text-brand-600 sm:text-5xl">{ticket}</div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(ticket)
                toast.push('Ticket number copied.', 'success')
              }}
              className="mx-auto mt-4 flex items-center gap-2 text-sm font-medium text-mist-400 transition hover:text-mist-50"
            >
              <Copy size={14} /> Copy to clipboard
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link to="/track" className="btn-primary">
                <Search size={18} /> Track this repair
              </Link>
            </Magnetic>
            <button
              onClick={() => {
                setTicket('')
                setForm(EMPTY)
                setStep(1)
                captcha.refresh()
              }}
              className="btn-ghost"
            >
              Book another device
            </button>
          </div>

          <p className="mt-9 border-t border-ink-700 pt-7 text-sm text-mist-500">
            Bring the device to {settings.address_line2 || 'our counter'} any day between {settings.hours_weekday}, or
            call <span className="text-mist-300">{settings.phone_primary}</span> to arrange a free pickup within Ranchi.
          </p>
        </motion.div>
      </div>
    )
  }

  /* ------------------------------- the form ----------------------------- */
  return (
    <div className="relative px-4 pb-24 pt-16 sm:px-6">

      <div className="relative mx-auto max-w-3xl">
        <Reveal className="text-center">
          <span className="chip border border-brand-700/30 bg-brand-600/10 text-brand-700">
            <Wrench size={13} /> Repair booking
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold sm:text-6xl">
            Book a <span className="text-brand-600">repair</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-mist-400">
            Three short steps. You get a ticket number instantly and can follow every stage of the repair online.
          </p>
        </Reveal>

        {/* step rail */}
        <Reveal delay={0.1}>
          <ol className="mt-12 flex items-center justify-center gap-3 sm:gap-6">
            {STEPS.map((s, i) => {
              const done = step > s.id
              const active = step === s.id
              return (
                <li key={s.id} className="flex items-center gap-3 sm:gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={{ scale: active ? 1.08 : 1 }}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors ${ done ? 'border-brand-600/40 bg-brand-600/15 text-brand-600' : active ? 'border-transparent bg-brand-600 text-white' : 'border-ink-700 bg-ink-800 text-mist-500' }`}
                    >
                      {done ? <CheckCircle2 size={20} /> : <s.icon size={19} />}
                    </motion.div>
                    <span className={`text-[11px] font-semibold ${active ? 'text-mist-50' : 'text-mist-500'}`}>
                      {s.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span className={`h-px w-8 sm:w-16 ${step > s.id ? 'bg-brand-600/50' : 'bg-ink-700'}`} />
                  )}
                </li>
              )
            })}
          </ol>
        </Reveal>

        <Reveal delay={0.16}>
          <form
            onSubmit={submit}
            className="mt-12 rounded-[2rem] border border-ink-700 bg-ink-900 lift p-7 backdrop-blur sm:p-10"
          >
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="label" htmlFor="name">Full name *</label>
                    <input
                      id="name" className="field" value={form.name} required
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="e.g. Rohit Kumar Singh"
                    />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="phone">Mobile number *</label>
                      <input
                        id="phone" className="field" inputMode="numeric" maxLength={10} required
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit number"
                      />
                      <p className="mt-2 text-xs text-mist-500">You will need this number to track the repair.</p>
                    </div>
                    <div>
                      <label className="label" htmlFor="email">Email (optional)</label>
                      <input
                        id="email" type="email" className="field" value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="label">Brand *</label>
                    <div className="flex flex-wrap gap-2">
                      {BRANDS.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => set('deviceBrand', brand)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${ form.deviceBrand === brand ? 'border-brand-700 bg-brand-600/20 text-mist-50' : 'border-ink-700 bg-ink-800 text-mist-400 hover:border-ink-500 hover:text-mist-50' }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="model">Model *</label>
                      <input
                        id="model" className="field" value={form.deviceModel}
                        onChange={(e) => set('deviceModel', e.target.value)}
                        placeholder="e.g. Galaxy S23 FE"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="imei">IMEI (optional)</label>
                      <input
                        id="imei" className="field" inputMode="numeric" maxLength={15} value={form.imei}
                        onChange={(e) => set('imei', e.target.value.replace(/\D/g, '').slice(0, 15))}
                        placeholder="Dial *#06# to see it"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="label" htmlFor="issue">What needs fixing? *</label>
                    <select
                      id="issue" className="field" value={form.issueType} required
                      onChange={(e) => set('issueType', e.target.value)}
                    >
                      <option value="">Choose a service…</option>
                      {issueTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="desc">Describe the problem</label>
                    <textarea
                      id="desc" className="field min-h-32 resize-y" value={form.issueDesc}
                      onChange={(e) => set('issueDesc', e.target.value)}
                      placeholder="When did it start? Has anyone opened the phone before? The more you tell us, the faster the diagnosis."
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="date">Preferred drop-off date (optional)</label>
                    <input
                      id="date" type="date" className="field" value={form.preferredDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => set('preferredDate', e.target.value)}
                    />
                  </div>

                  <div className="border-t border-ink-700 pt-6">
                    <CaptchaBox captcha={captcha} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* controls */}
            <div className="mt-10 flex items-center justify-between gap-4 border-t border-ink-700 pt-7">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="btn-ghost px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={16} /> Back
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => stepValid(step) && setStep((s) => s + 1)}
                  disabled={!stepValid(step)}
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || !stepValid(3) || captcha.text.length < 4}
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  {submitting ? 'Submitting…' : 'Confirm booking'}
                  {!submitting && <CheckCircle2 size={16} />}
                </button>
              )}
            </div>
          </form>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-8 text-center text-sm text-mist-500">
            Prefer to talk? Call{' '}
            <a href={`tel:${(settings.phone_primary || '').replace(/\s/g, '')}`} className="text-brand-600 hover:underline">
              {settings.phone_primary}
            </a>{' '}
            — we are open {settings.hours_weekday}, seven days a week.
          </p>
        </Reveal>
      </div>
    </div>
  )
}
