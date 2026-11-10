import { useSettings } from '@/lib/useSettings'

/**
 * The shop's text logo: the first word of the name set wide, then the rest
 * of the name small, behind a short teal rule. Read from the CMS shop name.
 */
export default function Wordmark({ className = '' }: { className?: string }) {
  const settings = useSettings()
  const [first, ...rest] = (settings.shop_name || 'Vaishnavi Mobile Point').trim().split(/\s+/)
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="text-[21px] font-medium uppercase tracking-[0.2em] text-black sm:text-[25px]">{first}</span>
      {/* Not rendered between flex items, but keeps the name "Vaishnavi
          Mobile Point" rather than "VaishnaviMobile Point" for screen
          readers and for anything that reads the link's text. */}
      {' '}
      {rest.length > 0 && (
        <span className="mt-1.5 flex items-center gap-2 self-end text-[9px] font-medium uppercase tracking-[0.3em] text-black/60">
          <span className="h-px w-5 bg-[var(--st-accent)]" aria-hidden="true" />
          {rest.join(' ')}
        </span>
      )}
    </span>
  )
}
