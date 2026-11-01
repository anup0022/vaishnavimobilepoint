(function () {
  'use strict';

  const STEPS = [
    {
      title: "What's wrong with it?",
      sub: 'Step 1 of 3 &middot; takes about 20 seconds',
      key: 'fault',
      options: [
        { ico: '▣', label: 'Shattered Screen',   hint: 'Cracks, dead touch, black patches' },
        { ico: '⚡', label: 'Battery Draining',   hint: 'Dies fast, shuts off above 20%' },
        { ico: '⌁', label: 'Charging Port',      hint: 'Loose cable, slow or no charge' },
        { ico: '◉', label: 'Camera Problem',     hint: 'Blurry, shaking, black preview' },
        { ico: '◌', label: 'Water Damage',       hint: 'Dropped in water, acting strange' },
      ],
    },
    {
      title: 'Which phone is it?',
      sub: 'Step 2 of 3 &middot; so we can check the part is in stock',
      key: 'model',
      options: [
        { ico: '\u25CF', label: 'iPhone',    hint: '11 and newer' },
        { ico: '◆', label: 'Samsung',  hint: 'Galaxy S, A and M series' },
        { ico: '◈', label: 'OnePlus',  hint: 'Nord and flagship' },
        { ico: '◇', label: 'Xiaomi / Redmi', hint: 'Note, Poco and Mi' },
        { ico: '○', label: 'Something else', hint: 'vivo, OPPO, realme, Motorola' },
      ],
    },
    {
      title: 'When suits you?',
      sub: 'Step 3 of 3 &middot; walk in, no appointment needed',
      key: 'when',
      options: [
        { ico: '⚡', label: 'Right now',      hint: 'Most screens done in 90 minutes' },
        { ico: '☀', label: 'Later today',    hint: 'Open until 8:30pm' },
        { ico: '▦', label: 'Tomorrow',       hint: 'Drop it in the morning' },
        { ico: '✎', label: "I'll call first", hint: 'We will hold the part for you' },
      ],
    },
  ];

  const viewport = document.getElementById('viewport');
  // Steps are swapped wholesale, which a screen reader otherwise never hears.
  viewport.setAttribute('aria-live', 'polite');
  viewport.setAttribute('aria-atomic', 'false');
  const titleEl  = document.getElementById('wz-title');
  const subEl    = document.getElementById('wz-sub');
  const crumbs   = [...document.querySelectorAll('.crumb')];

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SLIDE_MS = 240;

  const answers = {};
  let index = 0;
  let busy = false;   // guards against a double-tap starting two transitions

  function stepMarkup(step, i) {
    const back = i > 0
      ? '<button class="back" data-back>&larr; Back</button>'
      : '';
    const opts = step.options.map((o, n) => `
      <button class="option" data-choose="${o.label}" style="--n:${n}">
        <span class="ico">${o.ico}</span>
        <span><b>${o.label}</b><small>${o.hint}</small></span>
        <span class="chev">&rsaquo;</span>
      </button>`).join('');
    return `<div class="step">${opts}${back}</div>`;
  }

  function summaryMarkup() {
    return `
      <div class="step">
        <div class="done">
          <div class="tick">✓</div>
          <h2 style="margin:0 0 4px;font-size:18px;">Booking ready</h2>
          <p class="sub" style="margin:0;">Bring it to Churi Centre Gali, Ratu Road.</p>
          <div class="summary">
            <div><span>Fault</span><span>${answers.fault || '—'}</span></div>
            <div><span>Phone</span><span>${answers.model || '—'}</span></div>
            <div><span>When</span><span>${answers.when || '—'}</span></div>
          </div>
          <button class="restart" data-restart>Start again</button>
        </div>
      </div>`;
  }

  /*
   * The height animation is the part people get wrong. You cannot transition
   * to `auto`, so the next step is measured off-screen first, the viewport is
   * locked to that pixel height, and only then does the swap run. One forced
   * reflow per step, deliberately placed, instead of a janky guess.
   */
  function render(html, goingBack) {
    const outgoing = viewport.querySelector('.step');
    const startH = viewport.offsetHeight;

    const holder = document.createElement('div');
    holder.innerHTML = html;
    const incoming = holder.firstElementChild;

    // Measure the incoming step without the user seeing it.
    incoming.style.position = 'absolute';
    incoming.style.visibility = 'hidden';
    incoming.style.left = '22px';
    incoming.style.right = '22px';
    viewport.appendChild(incoming);
    const endH = incoming.offsetHeight + 42;   // + the viewport's vertical padding
    incoming.removeAttribute('style');

    if (calm.matches) {
      if (outgoing) outgoing.remove();
      viewport.style.height = '';
      busy = false;
      return;
    }

    viewport.style.height = startH + 'px';

    if (outgoing) {
      outgoing.classList.add('is-leaving');
      if (goingBack) outgoing.classList.add('back');
    }
    incoming.classList.add('is-entering');
    if (goingBack) incoming.classList.add('back');

    // Next frame, so the browser has the start height committed before the
    // transition to the end height begins.
    requestAnimationFrame(() => {
      viewport.style.height = endH + 'px';
    });

    window.setTimeout(() => {
      if (outgoing) outgoing.remove();
      incoming.classList.remove('is-entering', 'back');
      incoming.style.position = '';
      viewport.style.height = '';   // back to auto, so it reflows with content
      /*
       * The old step was removed from the DOM with focus still inside it, so
       * focus fell to <body> and a keyboard user was dumped back to the top of
       * the document on every step. Move focus into the new step instead.
       */
      const first = incoming.querySelector('.option, .restart, .back');
      if (first) first.focus({ preventScroll: true });
      busy = false;
    }, SLIDE_MS);
  }

  function show(i, goingBack) {
    index = i;
    crumbs.forEach((c, n) => {
      c.classList.toggle('done', n < i);
      c.classList.toggle('active', n === i);
    });
    if (i >= STEPS.length) {
      titleEl.textContent = 'All set';
      subEl.innerHTML = 'We have what we need';
      render(summaryMarkup(), goingBack);
    } else {
      titleEl.textContent = STEPS[i].title;
      subEl.innerHTML = STEPS[i].sub;
      render(stepMarkup(STEPS[i], i), goingBack);
    }
  }

  /*
   * Press feedback is bound to pointerdown, not click. The dip has to happen
   * while the finger is still down — waiting for click puts it after the
   * gesture is over, which is exactly what makes a UI feel laggy even when
   * the numbers say it is fast.
   */
  viewport.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.option');
    if (btn && !busy) btn.classList.add('is-pressed');
  });

    /*
   * Clearing the dip used to depend on the release landing on the same card.
   * Lift your finger a few pixels outside it, or drag off it, and the card
   * stayed visibly pressed for good. pointerleave was bound to the viewport,
   * so it could never match an option either. Clear every pressed card on any
   * release, wherever it happens, and bind the window as the backstop.
   */
  function clearPressed(bounceTarget) {
    viewport.querySelectorAll('.option.is-pressed').forEach((btn) => {
      btn.classList.remove('is-pressed');
      if (btn === bounceTarget && !calm.matches) {
        btn.classList.add('is-releasing');
        btn.addEventListener('animationend', () => btn.classList.remove('is-releasing'), { once: true });
      }
    });
  }

  viewport.addEventListener('pointerup', (e) => {
    clearPressed(e.target.closest ? e.target.closest('.option') : null);
  });
  ['pointercancel', 'pointerleave', 'blur'].forEach((type) => {
    window.addEventListener(type, () => clearPressed(null));
  });

  viewport.addEventListener('click', (e) => {
    if (busy) return;

    const choice = e.target.closest('[data-choose]');
    if (choice) {
      busy = true;
      answers[STEPS[index].key] = choice.dataset.choose;
      /*
       * Originally this waited 110ms so the bounce could play before the
       * slide. Measured end to end that made tap-to-settled ~370ms, over
       * budget — and it was redundant, because the dip already fired on
       * pointerdown and the user has seen it before click even arrives.
       * A 30ms beat is enough for the release animation to start; the
       * bounce then finishes on the card as it slides away. Total is now
       * 30 + 240 = 270ms.
       */
      window.setTimeout(() => show(index + 1, false), calm.matches ? 0 : 30);
      return;
    }

    if (e.target.closest('[data-back]')) {
      busy = true;
      show(index - 1, true);
      return;
    }

    if (e.target.closest('[data-restart]')) {
      busy = true;
      Object.keys(answers).forEach((k) => delete answers[k]);
      show(0, true);
    }
  });

  show(0, false);
})();
