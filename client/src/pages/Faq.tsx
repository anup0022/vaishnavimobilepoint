import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { WhatsApp } from '@/components/BrandIcons'
import Reveal from '@/components/Reveal'
import { useSettings, whatsappLink } from '@/lib/useSettings'
// Shared with the server, which writes every answer into the HTML it sends.
import FAQS from '@/data/faqs.json'

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
                    aria-controls={`faq-answer-${i}`}
                  >
                    <span className="font-display text-lg font-semibold">{faq.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <ChevronDown size={20} className={isOpen ? 'text-brand-700' : 'text-mist-500'} />
                    </motion.span>
                  </button>
                  {/*
                    Every answer stays in the page, collapsed rather than
                    removed. Mounting only the open one meant nine of the ten
                    answers, the warranty terms among them, never existed for
                    search engines or anyone reading the page without clicking.
                  */}
                  <motion.div
                    id={`faq-answer-${i}`}
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                    // Closed answers leave the accessibility tree and the tab
                    // order, but stay in the document: reader-mode text
                    // extractors drop aria-hidden content outright.
                    inert={!isOpen}
                  >
                    <p className="px-6 pb-6 text-[15px] leading-relaxed text-mist-300">{faq.a}</p>
                  </motion.div>
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
                <WhatsApp size={18} /> WhatsApp us
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
