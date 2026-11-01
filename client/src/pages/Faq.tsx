import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react'
import Reveal from '@/components/Reveal'
import { useSettings, whatsappLink } from '@/lib/useSettings'

const FAQS = [
  { q: 'Where exactly is the shop?',
    a: "We are opposite Galaxia Mall in Churi Centre Gali, the lane just off Ratu Road at Sukhdeo Nagar, Ranchi 834005. Look for the blue Vaishnavi Mobile Point signboard as you turn in from Ratu Road. Some directories still list us as Vaishnavi Mobile Center or Vaishnavi Dial Point — it is the same shop." },
  { q: 'Do I need an appointment for a repair?',
    a: 'No. You can walk in any day during opening hours. Booking online simply means we reserve bench time for you and you get a ticket number to track the job, which saves waiting at the counter.' },
  { q: 'How does the repair tracking work?',
    a: 'Every device we take in gets a ticket number such as VMS-7K4PQ2. Enter that ticket plus the mobile number you registered on the Track page and you will see the current stage, our technician notes and the estimate. Both the ticket and the phone number have to match, so nobody else can look up your repair.' },
  { q: 'Are the spare parts genuine?',
    a: 'We use original or service-pack parts for every brand we stock, and the part type is written on your warranty slip. If a genuine part is unavailable for an older model we will tell you before fitting an alternative, and price it accordingly.' },
  { q: 'What warranty do I get on a repair?',
    a: 'Six months on displays and batteries, three months on most board-level and module work, and one month on liquid-damage revival. The warranty covers the part and our workmanship, not fresh physical or liquid damage.' },
  { q: 'Can you recover my photos from a dead phone?',
    a: 'Usually yes. We always attempt a data pull before any firmware reflash, and we do not copy or keep anything from your device. Recovery from a physically destroyed storage chip is the one case where we often cannot help.' },
  { q: 'Do you buy or exchange old phones?',
    a: 'Yes. Bring the device and a bill or box if you have it. We inspect it at the counter and adjust the value directly against your new purchase, usually within ten minutes.' },
  { q: 'Do you offer EMI or card payment?',
    a: 'We accept all major cards, UPI and cash, and offer no-cost EMI on most phones above ₹15,000 through Bajaj Finserv and leading bank cards. Carry your PAN and a card for the EMI paperwork.' },
  { q: 'Is pickup and drop available?',
    a: 'Free pickup within 8 km of Ratu Road for repairs above ₹1,500, on request and subject to rider availability. Call us and we will tell you the same-day slot.' },
  { q: 'Do you give a GST invoice?',
    a: 'Always. Every sale and every repair is billed with our GSTIN printed on it. Ask at the counter if you need the invoice in a company name.' },
]

export default function Faq() {
  const settings = useSettings()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="relative px-4 pb-24 pt-16 sm:px-6">

      <div className="relative mx-auto max-w-3xl">
        <Reveal className="text-center">
          <span className="chip border border-brand-500/30 bg-brand-500/10 text-brand-600">
            <HelpCircle size={13} /> Questions
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold sm:text-6xl">
            Frequently <span className="text-brand-600">asked</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-mist-400">
            The things customers ask us at the counter every week.
          </p>
        </Reveal>

        <div className="mt-14 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            return (
              <Reveal key={faq.q} delay={Math.min(i * 0.04, 0.3)}>
                <div
                  className={`overflow-hidden rounded-2xl border transition-colors ${ isOpen ? 'border-brand-700/35 bg-brand-600/8' : 'border-ink-700 bg-ink-850 lift' }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-lg font-semibold">{faq.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <ChevronDown size={20} className={isOpen ? 'text-brand-700' : 'text-mist-500'} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="px-6 pb-6 text-[15px] leading-relaxed text-mist-300">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-14 rounded-3xl border border-ink-700 bg-ink-900 lift p-9 text-center">
            <h2 className="font-display text-2xl font-bold">Still not answered?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mist-400">
              Message us on WhatsApp — someone at the counter usually replies within a few minutes during shop hours.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href={whatsappLink(settings)} target="_blank" rel="noreferrer noopener" className="btn-primary">
                <MessageCircle size={18} /> WhatsApp us
              </a>
              <Link to="/contact" className="btn-ghost">
                Other ways to reach us
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
