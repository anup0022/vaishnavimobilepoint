import { Phone, MapPin } from 'lucide-react'
import { WhatsApp } from './BrandIcons'
import { useSettings, whatsappLink, fullAddress } from '@/lib/useSettings'
import Magnetic from './Magnetic'

/**
 * Stamped into the shell by the server when the host's filesystem does not
 * survive a restart, so this is known before first paint and no form ever
 * flashes in. See EPHEMERAL in server/util.js.
 */
export const formsOffline =
  typeof document !== 'undefined' &&
  document.querySelector('meta[name="vmp-forms"]')?.getAttribute('content') === 'offline'

interface Props {
  title: string
  body: string
  /** Pre-filled WhatsApp text, so the customer does not start from a blank chat. */
  message: string
}

/**
 * Stands in for a form the server cannot accept. Every route to the counter
 * it offers is one that reaches a person directly, because anything typed
 * into a form here would be written to a database that is about to vanish.
 */
export default function TalkToUs({ title, body, message }: Props) {
  const settings = useSettings()
  const tel = (settings.phone_primary || '').replace(/\s/g, '')

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-ink-700 bg-ink-900 lift-lg p-7 text-center sm:p-9">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/15 text-brand-700">
        <WhatsApp size={24} />
      </span>

      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mist-400">{body}</p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Magnetic>
          <a
            href={whatsappLink(settings, message)}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-primary"
          >
            <WhatsApp size={17} /> WhatsApp us
          </a>
        </Magnetic>
        <a href={`tel:${tel}`} className="btn-ghost">
          <Phone size={17} /> {settings.phone_primary}
        </a>
      </div>

      <p className="mt-7 flex items-start justify-center gap-2 border-t border-ink-700 pt-5 text-left text-[12px] leading-relaxed text-mist-500">
        <MapPin size={14} className="mt-0.5 shrink-0 text-brand-700" />
        {fullAddress(settings)}
      </p>
    </div>
  )
}
