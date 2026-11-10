import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin, Phone, Mail, Clock4, Send, CheckCircle2, Navigation, Store,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useCaptcha } from '@/lib/useCaptcha'
import { useToast } from '@/components/Toast'
import { useSettings, fullAddress, whatsappLink, mapEmbedUrl, mapDirectionsUrl } from '@/lib/useSettings'
import CaptchaBox from '@/components/CaptchaBox'
import Reveal from '@/components/Reveal'
import Magnetic from '@/components/Magnetic'
import TalkToUs, { formsOffline } from '@/components/TalkToUs'
import { WhatsApp } from '@/components/BrandIcons'

const SUBJECTS = [
  'General enquiry', 'Product availability & price', 'Repair enquiry', 'Bulk / corporate order',
  'Exchange valuation', 'Complaint or feedback',
]

export default function Contact() {
  const settings = useSettings()
  const toast = useToast()
  const captcha = useCaptcha()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: SUBJECTS[0], message: '' })

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSending(true)
    try {
      const result = await api.post<{ message: string }>('/api/contact', {
        ...form,
        captchaId: captcha.id,
        captchaText: captcha.text,
      })
      setSent(true)
      toast.push(result.message, 'success')
      setForm({ name: '', phone: '', email: '', subject: SUBJECTS[0], message: '' })
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Could not send your message.', 'error')
    } finally {
      captcha.refresh()
      setSending(false)
    }
  }

  const phoneHref = (value: string) => `tel:${(value || '').replace(/\s/g, '')}`

  return (
    <div className="relative px-4 pb-24 pt-16 sm:px-6">

      <div className="relative mx-auto max-w-7xl">
        <Reveal className="text-center">
          <span className="chip border border-brand-500/30 bg-brand-500/10 text-brand-600">
            <Store size={13} /> Get in touch
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold sm:text-6xl">
            Contact <span className="text-brand-600">us</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-mist-400">
            Call, message or simply walk in. We are opposite Galaxia Mall in Churi Centre Gali, off Ratu Road, open every day of the week.
          </p>
        </Reveal>

        {/* quick contact cards */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Phone, label: 'Call the counter', value: settings.phone_primary, href: phoneHref(settings.phone_primary), tone: 'text-brand-700 bg-brand-600/15' },
            { icon: WhatsApp, label: 'WhatsApp', value: 'Chat with us', href: whatsappLink(settings), tone: 'text-brand-600 bg-brand-600/15', external: true },
            { icon: Mail, label: 'Email', value: settings.email, href: `mailto:${settings.email}`, tone: 'text-brand-600 bg-brand-500/15' },
            { icon: Navigation, label: 'Directions', value: 'Open in Maps', href: mapDirectionsUrl(settings), tone: 'text-brand-600 bg-brand-600/15', external: true },
          ].map((card, i) => (
            <Reveal key={card.label} delay={Math.min(i * 0.04, 0.3)}>
              <a
                href={card.href}
                {...(card.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                className="group flex h-full flex-col gap-4 rounded-3xl border border-ink-700 bg-ink-850 lift p-7 transition-all duration-300 hover:-translate-y-1 active:scale-[0.985] hover:border-brand-600/45"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
                  <card.icon size={21} />
                </span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-mist-500">{card.label}</div>
                  <div className="mt-1 font-semibold transition-colors group-hover:text-brand-700">{card.value}</div>
                </div>
              </a>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          {/* shop details + map */}
          <div className="space-y-6">
            <Reveal>
              <div className="rounded-3xl border border-ink-700 bg-ink-900 lift p-8">
                <h2 className="mb-6 font-display text-2xl font-bold">Shop details</h2>
                <ul className="space-y-6 text-sm">
                  <li className="flex gap-4">
                    <MapPin size={19} className="mt-0.5 shrink-0 text-brand-700" />
                    <div>
                      <div className="mb-1 font-semibold text-mist-50">Address</div>
                      <p className="leading-relaxed text-mist-400">{fullAddress(settings)}</p>
                      <p className="mt-1.5 text-xs text-mist-500">
                        Landmark: opposite Galaxia Mall, in Churi Centre Gali off Ratu Road.
                      </p>
                      {settings.plus_code && (
                        <p className="mt-2 text-xs text-mist-500">
                          Plus Code:{' '}
                          <code className="rounded bg-ink-800 px-1.5 py-0.5 font-semibold text-mist-300">
                            {settings.plus_code}
                          </code>{' '}
                          — type this into Google Maps to land exactly at our door.
                        </p>
                      )}
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <Phone size={19} className="mt-0.5 shrink-0 text-brand-700" />
                    <div>
                      <div className="mb-1 font-semibold text-mist-50">Phone</div>
                      <a href={phoneHref(settings.phone_primary)} className="block text-mist-400 transition hover:text-brand-700">
                        {settings.phone_primary} <span className="text-xs text-mist-500">(sales)</span>
                      </a>
                      {settings.phone_secondary && (
                        <a href={phoneHref(settings.phone_secondary)} className="block text-mist-400 transition hover:text-brand-700">
                          {settings.phone_secondary} <span className="text-xs text-mist-500">(service)</span>
                        </a>
                      )}
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <Clock4 size={19} className="mt-0.5 shrink-0 text-brand-700" />
                    <div>
                      <div className="mb-1 font-semibold text-mist-50">Opening hours</div>
                      <p className="text-mist-400">Monday &ndash; Saturday: {settings.hours_weekday}</p>
                      <p className="text-mist-400">Sunday: {settings.hours_sunday}</p>
                      <p className="mt-1.5 text-xs text-brand-600">{settings.closed_day}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="overflow-hidden rounded-3xl border border-ink-700">
                <iframe
                  title="Map to Vaishnavi Mobile Point, Ratu Road"
                  src={mapEmbedUrl(settings)}
                  className="h-[320px] w-full border-0 grayscale-[35%] contrast-110"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Reveal>
          </div>

          {/* message form */}
          <Reveal direction="left">
            {formsOffline ? (
              <TalkToUs
                title="Message us on WhatsApp"
                body="The fastest way to reach the counter. Ask about a price, a part or whether we have something in stock — we usually reply the same working day."
                message="Hi! I have a question about "
              />
            ) : (
            <div className="rounded-[2rem] border border-ink-700 bg-ink-900 lift p-8 backdrop-blur sm:p-10">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex min-h-[420px] flex-col items-center justify-center text-center"
                >
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600/15 text-brand-600">
                    <CheckCircle2 size={36} />
                  </div>
                  <h2 className="font-display text-3xl font-bold">Message sent</h2>
                  <p className="mx-auto mt-4 max-w-sm leading-relaxed text-mist-400">
                    It has landed in the shop inbox. We usually reply the same working day — for anything urgent,
                    WhatsApp is faster.
                  </p>
                  <button onClick={() => setSent(false)} className="btn-ghost mt-8">
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <>
                  <h2 className="mb-2 font-display text-2xl font-bold">Send us a message</h2>
                  <p className="mb-8 text-sm text-mist-400">
                    Leave a phone number or email and we will get back to you.
                  </p>

                  <form onSubmit={submit} className="space-y-5">
                    <div>
                      <label className="label" htmlFor="c-name">Your name *</label>
                      <input
                        id="c-name" className="field" required value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="c-phone">Mobile number</label>
                        <input
                          id="c-phone" className="field" inputMode="numeric" maxLength={10} value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          placeholder="10-digit number"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="c-email">Email</label>
                        <input
                          id="c-email" type="email" className="field" value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                    <p className="-mt-2 text-xs text-mist-500">Leave at least one of the two so we can reply.</p>

                    <div>
                      <label className="label" htmlFor="c-subject">Subject</label>
                      <select
                        id="c-subject" className="field" value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label" htmlFor="c-message">Message *</label>
                      <textarea
                        id="c-message" className="field min-h-32 resize-y" required value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="How can we help?"
                      />
                    </div>

                    <CaptchaBox captcha={captcha} />

                    <Magnetic className="block">
                      <button
                        type="submit"
                        disabled={sending || !form.name.trim() || !form.message.trim() || (!form.phone && !form.email)}
                        className="btn-primary w-full"
                      >
                        {sending ? 'Sending…' : 'Send message'}
                        {!sending && <Send size={18} />}
                      </button>
                    </Magnetic>
                  </form>
                </>
              )}
            </div>
            )}
          </Reveal>
        </div>
      </div>
    </div>
  )
}
