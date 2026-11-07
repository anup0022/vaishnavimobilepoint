import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export interface SectionDef {
  id: string
  label: string
}

/**
 * Right-hand rail that tracks which snap section is on screen and lets you
 * jump between them. Hidden on small screens, where there is no room.
 */
export default function SectionNav({ sections }: { sections: SectionDef[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // The entry covering the most of the viewport wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      // The lowest step is there for the pinned repair bench: it is several
      // viewports tall, so it can never cover more than a tenth of itself
      // and would otherwise cross no threshold at all.
      { threshold: [0.05, 0.25, 0.5, 0.75], rootMargin: '-80px 0px -40% 0px' },
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav
      aria-label="Page sections"
      className="pointer-events-none fixed right-5 top-1/2 z-[80] hidden -translate-y-1/2 xl:block"
    >
      <ul className="pointer-events-auto flex flex-col items-end gap-1">
        {sections.map((section) => {
          const isActive = active === section.id
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="group flex items-center justify-end gap-2.5 py-1.5"
                aria-current={isActive ? 'true' : undefined}
              >
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 ${ isActive ? 'bg-ink-900 text-mist-50 lift opacity-100' : 'bg-ink-900 text-mist-400 opacity-0 group-hover:opacity-100' }`}
                >
                  {section.label}
                </span>
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span
                    className={`block rounded-full transition-all duration-300 ${ isActive ? 'h-2.5 w-2.5 bg-brand-600' : 'h-1.5 w-1.5 bg-ink-600 group-hover:bg-mist-400' }`}
                  />
                  {isActive && (
                    <motion.span
                      layoutId="section-dot-ring"
                      className="absolute inset-[-5px] rounded-full border border-brand-600/45"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
