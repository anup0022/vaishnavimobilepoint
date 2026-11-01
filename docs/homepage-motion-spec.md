# Homepage motion specification
### Vaishnavi Mobile Point — sales + repair

Written against the site as it stands: React 19, Framer Motion 14, a custom
section-scroll engine, Tailwind v4. Numbers in here are measured on this
machine unless marked as a target.

---

## The one decision to make first

The site already has an animation engine. Framer Motion is imported in **29
files** driving **69 animated elements**, plus `useSectionScroll.ts` and five
CSS keyframe sets.

Adding GSAP + ScrollTrigger costs **45KB gzipped** (measured, self-hosted) on
top of a **177KB** bundle — a **25% increase** — and gives you a second
animation runtime with its own scheduler.

| | Framer Motion (already here) | GSAP + ScrollTrigger |
|---|---|---|
| Bundle cost | 0 (paid for) | +45KB gz |
| Scroll-linked progress | `useScroll` + `useTransform` | `scrub` |
| Pinning a section | hand-rolled | built in, good |
| Timeline choreography | awkward past 3 steps | excellent |
| Runs on the compositor | yes | yes (`force3D`) |

**Recommendation: keep Framer Motion.** Everything specified below is
achievable with what you already ship. The one thing GSAP does genuinely
better is *pinning* — holding a section still while its contents play
through — and nothing in this spec requires pinning.

Reach for GSAP only if you later want a pinned, multi-beat product story.
Working GSAP implementations are in `client/public/demos/` either way.

---

## Section 1 — Hero: sales and repair, equal weight

The hero has one job: a visitor who came to **buy** and a visitor whose screen
is **cracked** must both see their path within one second. Motion must not
delay that.

**Layout**

```
┌──────────────────────────────────────────────┐
│  headline (2 lines max)                      │
│  one-line subhead                            │
│                                              │
│  [ Book a Repair ]  [ Browse Phones ]        │   ← equal visual weight
│                                              │
│  24,000+ customers · 38,500+ repairs · 21 yrs│
└──────────────────────────────────────────────┘
```

**Motion**

| Element | Trigger | Animation | Timing |
|---|---|---|---|
| Headline | page load | fade + `y: 12px → 0` | 420ms, `cubic-bezier(.22,1,.36,1)` |
| Subhead | load, after headline | same, delayed | 380ms, +90ms delay |
| Both CTAs | load | fade + `y: 10px → 0`, **together** | 360ms, +180ms delay |
| Stat counters | element enters view | count 0 → value | 900ms, `easeOut`, **once** |
| Phone artwork | load | `scale .94 → 1`, fade | 700ms, +240ms delay |

**Rules**

- The two CTAs animate **as one group**. Staggering them implies a ranking,
  and the whole point is that repair and sales are equal doors.
- Total hero choreography ends by **900ms**. Past that, a visitor is waiting
  on decoration.
- Nothing in the hero is scroll-linked. The hero is visible before any scroll
  exists, so tying it to scroll means a visitor who doesn't move sees nothing.
- Counters animate **once**, not every time they re-enter view. A number that
  re-counts on scroll-back reads as a glitch.

---

## Section 2 — Phone catalogue

**Motion**

| Element | Trigger | Animation | Timing |
|---|---|---|---|
| Card grid | grid top crosses 85% of viewport | fade + `y: 20px → 0`, staggered | 420ms each, **70ms** stagger |
| Card (pointer) | hover | `y: -4px`, shadow deepens | 180ms |
| Card (touch) | `pointerdown` | `scale(.98)` | 120ms |
| Price / badge | with its card | no separate animation | — |

**Rules**

- **Cap the stagger.** 70ms × 12 cards is 840ms before the last card appears.
  Clamp it: `delay = Math.min(index * 0.04, 0.3)`.

  **Every stagger in the app now uses this clamp.** It previously appeared only
  in `ProductCard.tsx`, `Feedback.tsx`, `Faq.tsx` and `admin/`, while eight
  files used bare `i * delay`: `Home.tsx`, `Services.tsx` (×2), `About.tsx`
  (×3), `Track.tsx`, `Contact.tsx` and `admin/Dashboard.tsx`.

  An earlier draft of this document said Home was the only offender and that
  its tracking row was five items. Both were wrong — there were eight files,
  and the tracking row is three.

  Beyond ~6 items the eye stops reading a stagger as a sequence anyway.
- Stagger **by row**, not by index, on desktop. Items 1–4 share a row; making
  item 4 wait 210ms after item 1 looks broken when they're side by side.
- Never animate the price. Numbers that move are numbers people distrust.
- On touch, hover styles must not stick. Use `@media (hover: hover)` or the
  lift stays applied after the tap.

---

## Section 3 — Repair booking widget

The highest-value element on the page. It must feel like a native app, which
means feedback within **100ms of the finger**, not of the click.

**Motion**

| Element | Trigger | Animation | Timing |
|---|---|---|---|
| Option card | `pointerdown` | `scale(.965)` | **120ms** |
| Option card | `pointerup` | back-ease to `scale(1)` | 180ms, overshoots then settles |
| Current step | after choice | slide `-24px` + fade out | 240ms |
| Next step | same moment | slide in from `+28px` + fade | 240ms |
| Card height | same moment | measured height transition | 240ms |
| Progress bar | step change | width grows | 240ms |

**Measured: tap → next step settled = 286–295ms** across three steps, desktop
and 375px mobile. Budget was 300ms.

**Rules**

- Press feedback binds to **`pointerdown`**, not `click`. Waiting for click
  puts the dip *after* the gesture is over — the single biggest reason a UI
  that benchmarks fast still feels slow.
- The dip has already been seen by the time `click` fires, so the slide needs
  only a **30ms** beat before starting. An earlier draft waited 110ms "to let
  the bounce play" and measured **370ms** end to end — over budget, for an
  animation the user had already watched.
- Going **back** must mirror: previous step slides in from the left. Reusing
  the forward direction makes "back" feel like "forward" and loses people.
- Guard against double-taps with a `busy` flag, or two transitions overlap and
  the step counter desyncs.
- `touch-action: manipulation` on every option — removes the legacy 300ms tap
  delay, which would otherwise eat your entire budget on its own.

**Known trade-off:** the card height is animated, and `height` triggers
layout on each frame. The compositor-only alternatives (`transform: scaleY`,
`clip-path`) distort or clip the text. One element, 240ms, not scroll-linked —
acceptable. It would not be acceptable on a scroll-driven animation.

---

## Section 4 — Trust / warranty

**Motion**

| Element | Trigger | Animation | Timing |
|---|---|---|---|
| Benefit tiles | section at 85% | fade + `y: 16px → 0`, staggered | 380ms, 60ms stagger |
| Tile icon | tile revealed | `scale .8 → 1` | 300ms, back-ease, +80ms |
| Warranty seal | enters view | `rotate -6° → 0`, scale | 500ms, **once** |

**Rules**

- This section carries the reassurance. Movement should **settle**, not
  bounce. Keep overshoot for the booking widget, where it reads as
  responsiveness; here it reads as unserious.
- Four tiles maximum before the stagger starts to feel like a queue.

---

## The thing that mattered most, and it was not motion

The server was compressing nothing. The JS bundle went out at **606KB** where
**177KB** would do — 429KB wasted on every first visit, about **3.5 seconds**
of extra download on a 1Mbps connection.

Every animation timing in this document is worth less than that single line of
middleware. It is fixed (`compression` in `server/index.js`), and
`tools/verify.sh` now fails if it ever regresses.

Measured after the fix: JS −71%, CSS −82%, HTML −57%, API JSON −68%. Images
are correctly left alone, and clients that do not announce gzip still get
valid uncompressed responses.

## Mobile performance budget

Your customers are largely on budget Android handsets. These are not
aspirational numbers.

| Constraint | Budget | How it is met |
|---|---|---|
| Animated properties | `transform` + `opacity` only | everything above except the wizard height |
| Composited layers | promote only what moves, release after | `clearProps` / `will-change` removed on finish |
| Long tasks during scroll | none > 50ms | nothing scroll-linked does layout |
| Blur radius | 6px on phones (18px desktop) | enforced at `max-width: 767px` in `index.css` |
| Total hero choreography | ≤ 900ms | measured |
| Tap feedback latency | ≤ 100ms | `pointerdown`, 120ms dip |

**Non-negotiables**

1. **`translate3d(0,0,0)`, not `translateX()`** on anything that animates
   during scroll. The `z` promotes the element to its own compositor layer, so
   the GPU moves pixels instead of the CPU repainting them.
2. **Never animate `width`, `height`, `top`, `left`, `margin`** in a
   scroll-linked animation. Each one forces layout on every frame.
3. **Release the layer.** `will-change` left on permanently costs memory per
   element. GSAP's `clearProps`, or remove the class, once settled.
4. **Debounce mobile resize.** The URL bar collapsing fires a resize and
   changes viewport height mid-scroll. `ScrollTrigger.config({ ignoreMobileResize: true })`.
5. **Recalculate after fonts load.** Web fonts change text metrics, which moves
   every trigger point. `document.fonts.ready.then(refresh)`.

---

## Reduced motion

`prefers-reduced-motion: reduce` means **no movement**, not faster movement.
People enable it because motion makes them ill.

| Section | Reduced-motion behaviour |
|---|---|
| Hero | all elements at final state, no fade-in |
| Catalogue | cards visible immediately, no stagger |
| Booking widget | steps swap instantly; press feedback becomes colour, not scale |
| Trust tiles | visible immediately |
| Counters | final number shown, no counting |

Already handled in `index.css` (two blocks) and `useSectionScroll.ts`.

---

## The failure mode to design against

Scroll-reveal libraries hide content first and reveal it when a trigger fires.
**If the trigger never fires, the content is invisible and nothing errors.**

This is not hypothetical — the first draft of `specs-scroll.js` did exactly
this. `gsap.from()` wrote `opacity: 0` on page load, the trigger didn't fire,
and all five spec bullets stayed invisible. It was caught by measuring
computed opacity, not by looking at the page, because at a glance it just
looked like a section with no text yet.

Three defences, all applied in the demo:

1. Set the hidden state **explicitly**, animate on enter — never rely on a
   library's implicit "from" state.
2. If the element is already in view at load, reveal immediately rather than
   waiting for a scroll that may never happen on a short page.
3. Arm a **timeout that reveals regardless**. Costs nothing when the trigger
   works.

The content must be readable if the JavaScript fails entirely. In the demos,
the starting state lives in CSS behind a `.no-js` class that the script
removes — so a blocked or failed script leaves a plain, readable page.

---

## Running the demos

```
http://localhost:8470/demos/specs-scroll.html
http://localhost:8470/demos/repair-wizard.html
```

Served by your own container, so they work on your phone on the same Wi-Fi.
GSAP is self-hosted in `demos/vendor/` — the site's CSP is `script-src 'self'`
and blocks CDN scripts, which is working as intended.

Both carry a `Cache-Control: max-age=3600`. If you edit them and see no
change, that's the hour-long cache, not your edit.

To retune the wizard, every timing is a CSS variable at the top of the file:

```css
--t-press:  120ms;   /* finger down, card dips */
--t-slide:  240ms;   /* step out, next step in */
```

Measured 286–295ms tap-to-settled on this machine. A budget Android will run
10–20% slower; if you want hard headroom under 300ms there, set `--t-slide`
to `200ms` and change `SLIDE_MS` in the JS to match — the two must agree.
