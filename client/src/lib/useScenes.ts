import { useEffect, type RefObject } from 'react'

/**
 * Everything scroll-driven is gated on this. Pinning a scene on a phone traps
 * the thumb and puts the compositing cost on the weakest hardware our
 * customers carry; reduced motion means no movement at all.
 */
export const SCENE_QUERY = '(min-width: 768px) and (prefers-reduced-motion: no-preference)'

type GsapApi = typeof import('gsap').gsap

/**
 * Stagger clamped so the last item never waits on the first.
 * Past roughly six items the eye stops reading a stagger as a sequence.
 */
export const CLAMPED_STAGGER = { each: 0.06, amount: 0.3 } as const

/**
 * Builds a page's scroll scenes inside a GSAP context scoped to `scope`, so
 * every tween and trigger is reverted together when the route unmounts.
 *
 * GSAP is imported dynamically, and only once the viewport actually qualifies.
 * Nothing on this site is pinned below 768px or under reduced motion, so a
 * phone never downloads the library at all — which is most of this shop's
 * traffic, on mobile data.
 *
 * `build` therefore receives `gsap` as an argument rather than importing it,
 * and must never be the only thing that makes content visible: a tween that is
 * never fetched has to leave a readable page behind. Any `.from()` with a
 * scrollTrigger also needs `immediateRender: false`, or its start state is
 * applied at creation and a trigger that never fires strands the content at
 * `opacity: 0` with nothing logged.
 */
export function useScenes(
  scope: RefObject<HTMLElement | null>,
  build: (gsap: GsapApi) => void,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const query = window.matchMedia(SCENE_QUERY)
    let context: { revert: () => void } | null = null
    let cancelled = false

    async function start() {
      if (cancelled || context || !scope.current) return

      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      if (cancelled || !scope.current) return

      gsap.registerPlugin(ScrollTrigger)
      /* On a phone the URL bar collapsing fires a resize and changes the
         viewport height mid-scroll, recalculating every trigger point while
         the thumb is still moving. */
      ScrollTrigger.config({ ignoreMobileResize: true })

      const mm = gsap.matchMedia(scope.current)
      mm.add(SCENE_QUERY, () => build(gsap))
      context = mm

      // Web fonts change text metrics, which moves every trigger point.
      document.fonts?.ready.then(() => ScrollTrigger.refresh())
    }

    if (query.matches) start()

    // A window dragged wide, or a phone turned sideways, should still get the
    // scenes rather than a page that stays flat for the rest of the visit.
    const onChange = () => query.matches && start()
    query.addEventListener('change', onChange)

    return () => {
      cancelled = true
      query.removeEventListener('change', onChange)
      context?.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
