(function () {
  'use strict';

  // If GSAP did not load, leave the page in its plain, readable state.
  if (!window.gsap || !window.ScrollTrigger) return;

  document.body.classList.remove('no-js');
  gsap.registerPlugin(ScrollTrigger);

  // force3D promotes animated elements to their own compositor layer, so the
  // GPU moves pixels instead of the CPU repainting them each frame.
  gsap.defaults({ force3D: true, ease: 'none' });

  /*
   * gsap.matchMedia is the whole accessibility and responsiveness story in
   * one place. Each context builds its own timelines and, crucially, GSAP
   * tears them down and reverts every inline style when the query stops
   * matching — rotate a phone to landscape and the desktop timeline is
   * disposed of rather than left running against a layout it no longer fits.
   */

  /*
   * gsap.from() with a ScrollTrigger writes the "from" state (opacity 0) the
   * moment the page loads, and only undoes it if the trigger fires. If the
   * trigger never fires — a mis-measured offset, a resize mid-load, a layout
   * the library did not expect — the content stays invisible forever. That is
   * the single most common way a scroll library breaks a page, and it fails
   * silently because nothing errors.
   *
   * So: set the hidden state explicitly, animate on enter, and arm a timer
   * that reveals everything regardless. If the trigger works the timer finds
   * nothing left to do; if it does not, the reader still gets the text.
   */
  function revealBullets(opts) {
    const items = gsap.utils.toArray('.bullet');
    if (!items.length) return;

    gsap.set(items, { y: opts.y, autoAlpha: 0 });

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      gsap.to(items, {
        y: 0,
        autoAlpha: 1,
        duration: opts.duration,
        ease: 'power2.out',
        stagger: opts.stagger,
        clearProps: 'transform',   // hand the layer back once it has settled
      });
    };

    const st = ScrollTrigger.create({
      trigger: '.bullets',
      start: opts.start,
      once: true,
      onEnter: reveal,
    });

    // Already in view at load? Reveal now rather than waiting for a scroll
    // that may never come on a short page.
    if (st.progress > 0 || st.isActive) reveal();

    // Last line of defence. Costs nothing if the trigger already fired.
    window.setTimeout(reveal, 2500);
  }

  const mm = gsap.matchMedia();

  const DESKTOP = '(min-width: 880px) and (prefers-reduced-motion: no-preference)';
  const MOBILE  = '(max-width: 879px) and (prefers-reduced-motion: no-preference)';
  const CALM    = '(prefers-reduced-motion: reduce)';

  // ---- Desktop: the full move, pinned ------------------------------------
  mm.add(DESKTOP, () => {
    gsap.timeline({
      scrollTrigger: {
        trigger: '#specs',
        start: 'top 80%',
        end: 'bottom 20%',
        // A number rather than `true`: the animation trails the scroll by
        // ~0.6s, which smooths the jitter of a trackpad or a cheap mouse
        // wheel without feeling disconnected from the gesture.
        scrub: 0.6,
      },
    })
    .fromTo('.phone',
      { rotate: 0, scale: 0.86, autoAlpha: 0.65 },
      { rotate: 45, scale: 1.06, autoAlpha: 1, duration: 1 },
      0
    );

    // The bullets are a separate trigger because they should land when the
    // text column is readable, not when the section first touches the fold.
    revealBullets({ y: 24, duration: 0.5, stagger: 0.08, start: 'top 85%' });
  });

  // ---- Mobile: shorter move, no pin --------------------------------------
  mm.add(MOBILE, () => {
    gsap.timeline({
      scrollTrigger: {
        trigger: '#specs',
        start: 'top 85%',
        end: 'bottom 35%',
        scrub: 0.4,
      },
    })
    .fromTo('.phone',
      { rotate: 0, scale: 0.94, autoAlpha: 0.8 },
      { rotate: 22, scale: 1.0, autoAlpha: 1, duration: 1 },
      0
    );

    revealBullets({ y: 16, duration: 0.4, stagger: 0.06, start: 'top 90%' });
  });

  // ---- Reduced motion: no movement at all --------------------------------
  // Not "faster animation" — no animation. Someone who asks for reduced
  // motion is often asking because movement makes them ill.
  mm.add(CALM, () => {
    gsap.set('.phone', { rotate: 0, scale: 1, autoAlpha: 1 });
    gsap.set('.bullet', { y: 0, autoAlpha: 1 });
  });

  // Fonts change text metrics, which changes where every trigger should
  // fire. Recalculating once they land avoids triggers aimed at stale offsets.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  // On mobile the URL bar collapsing fires a resize and changes viewport
  // height mid-scroll. ScrollTrigger handles this, but debouncing keeps it
  // from recalculating on every pixel of the bar's animation.
  ScrollTrigger.config({ ignoreMobileResize: true });
})();
