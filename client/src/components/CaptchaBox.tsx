import { RefreshCw, ShieldCheck } from 'lucide-react'
import type { CaptchaState } from '@/lib/useCaptcha'

interface Props {
  captcha: CaptchaState
  label?: string
}

export default function CaptchaBox({ captcha, label = 'Security check' }: Props) {
  return (
    <div>
      <label className="label flex items-center gap-2" htmlFor="captcha-input">
        <ShieldCheck size={14} className="text-brand-600" />
        {label}
      </label>

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="relative h-[72px] w-[220px] shrink-0 overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
          {captcha.loading || !captcha.svg ? (
            <div className="shimmer h-full w-full" />
          ) : (
            <div
              className="h-full w-full select-none"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: captcha.svg }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={captcha.refresh}
          className="flex h-[72px] w-12 shrink-0 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 text-mist-400 transition hover:border-brand-500/50 hover:text-mist-50"
          aria-label="Get a new security code"
          title="Get a new code"
        >
          <RefreshCw size={18} />
        </button>

        <input
          id="captcha-input"
          className="field h-[72px] min-w-[150px] flex-1 text-center text-2xl font-bold uppercase tracking-[0.4em]"
          value={captcha.text}
          onChange={(e) => captcha.setText(e.target.value.toUpperCase())}
          placeholder="CODE"
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
        />
      </div>

      <p className="mt-2 text-xs text-mist-500">
        Type the 5 characters shown above. Letters are not case-sensitive.
      </p>
    </div>
  )
}
