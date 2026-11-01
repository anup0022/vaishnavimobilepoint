import type { ReactNode } from 'react'
import Reveal from './Reveal'

interface Props {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

export default function SectionTitle({ eyebrow, title, subtitle, align = 'center', className = '' }: Props) {
  const alignment = align === 'center' ? 'text-center items-center mx-auto' : 'text-left items-start'

  return (
    <div className={`flex flex-col ${alignment} ${align === 'center' ? 'max-w-3xl' : ''} ${className}`}>
      {eyebrow && (
        <Reveal direction="scale">
          <span className="chip mb-5 border border-brand-700/30 bg-brand-600/10 text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-700" />
            {eyebrow}
          </span>
        </Reveal>
      )}
      <Reveal delay={0.06}>
        <h2 className="text-balance text-4xl font-bold sm:text-5xl">{title}</h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.14}>
          <p className={`mt-5 text-lg leading-relaxed text-mist-400 ${align === 'center' ? '' : 'max-w-2xl'}`}>
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  )
}
