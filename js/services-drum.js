(() => {
  'use strict';

  // What I Can Help With — the six services on a drum: their titles stand
  // round a wheel that turns towards you, like the dial of a watch. The one
  // in the window is chosen — it turns wine and its words appear beside the
  // wheel. Turn it by scrolling over it, dragging it, clicking a title, or
  // with the arrow keys; on touch screens, tap a title. Without this script
  // the services stay a plain grid.

  const drum = document.querySelector('.services__drum');
  const cards = drum ? [...drum.querySelectorAll('.service-card')] : [];
  if (!drum || cards.length < 2) return;

  const N = cards.length;
  const STEP = 26; // degrees between neighbouring titles
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pad = (n) => String(n).padStart(2, '0');

  // The wheel holds the cards; the side column shows the chosen one's words.
  const wheel = document.createElement('div');
  wheel.className = 'services__drum-wheel';
  wheel.tabIndex = 0;
  wheel.setAttribute('aria-label', 'Services wheel — use the arrow keys to turn');
  const windowEl = document.createElement('div');
  windowEl.className = 'services__drum-window';
  windowEl.setAttribute('aria-hidden', 'true');
  wheel.append(windowEl, ...cards);

  const side = document.createElement('div');
  side.className = 'services__drum-side';
  side.innerHTML =
    '<p class="services__drum-count" aria-hidden="true"></p>' +
    '<p class="services__drum-desc" aria-hidden="true"></p>' +
    '<a class="services__drum-link" href="#contact">Let\'s talk about it <span aria-hidden="true">&rarr;</span></a>' +
    `<p class="services__drum-hint" aria-hidden="true">${finePointer ? 'Scroll · Drag · Click' : 'Tap a service to turn'}</p>`;
  drum.append(wheel, side);
  drum.classList.add('is-drum');

  const count = side.querySelector('.services__drum-count');
  const desc = side.querySelector('.services__drum-desc');
  const titles = cards.map((c) => c.querySelector('h3'));
  const texts = cards.map((c) => (c.querySelector('p') || {}).textContent || '');

  let R = 150; // the wheel's radius
  let px = 60; // how far a drag moves the wheel by one title
  let cur = 1; // Brand Voice in the window to begin with
  let tgt = 1;
  let shown = -1;
  let raf = 0;
  let drag = null;
  let moved = false;

  function measure() {
    R = (wheel.clientHeight || 400) * 0.36;
    px = R * Math.sin((STEP * Math.PI) / 180);
  }

  function render() {
    cards.forEach((card, i) => {
      const k = cur - i;
      const d = Math.abs(k);
      // Titles fade out before they turn edge-on (they'd read as a faint line).
      const op = d > 2.5 ? 0 : Math.max(0, 1 - d * 0.36);
      const on = clamp(1 - d * 2, 0, 1); // charcoal → wine as it enters the window
      card.style.transform = `translateZ(${(-R).toFixed(1)}px) rotateX(${(k * STEP).toFixed(2)}deg) translateZ(${R.toFixed(1)}px)`;
      card.style.opacity = op.toFixed(3);
      card.style.pointerEvents = op < 0.05 ? 'none' : '';
      titles[i].style.color = `rgb(${Math.round(46 + 61 * on)}, ${Math.round(43 - 4 * on)}, ${Math.round(40 + 15 * on)})`;
    });
    const active = Math.round(clamp(cur, 0, N - 1));
    if (active !== shown) {
      shown = active;
      cards.forEach((c, i) => c.classList.toggle('is-active', i === active));
      count.textContent = `${pad(active + 1)} / ${pad(N)}`;
      desc.textContent = texts[active];
      if (!reduceMotion && desc.animate) {
        desc.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], {
          duration: 500,
          easing: 'cubic-bezier(.2,.7,.2,1)',
        });
      }
    }
  }

  function tick() {
    raf = 0;
    if (!drag) {
      cur += (tgt - cur) * (reduceMotion ? 1 : 0.12);
      if (Math.abs(tgt - cur) < 0.001) cur = tgt;
    }
    render();
    if (drag || cur !== tgt) raf = requestAnimationFrame(tick);
  }
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const go = (i) => {
    tgt = clamp(i, 0, N - 1);
    kick();
  };

  // Scrolling over the wheel turns it one title at a time; at either end the
  // page carries on scrolling as normal.
  let acc = 0;
  let lastWheel = 0;
  let lastStep = 0;
  wheel.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dir = Math.sign(e.deltaY);
      if (!dir || (dir < 0 && tgt <= 0) || (dir > 0 && tgt >= N - 1)) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 200) acc = 0;
      lastWheel = now;
      acc += e.deltaY;
      if (Math.abs(acc) > 30 && now - lastStep > 320) {
        go(Math.round(tgt) + dir);
        lastStep = now;
        acc = 0;
      }
    },
    { passive: false }
  );

  // Drag it up or down (mouse or pen — touch scrolls the page, so on phones
  // you tap a title instead); it settles on the nearest title when let go.
  wheel.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { y: e.clientY, start: cur };
    moved = false;
    kick();
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (!moved && Math.abs(dy) > 4) {
      moved = true;
      drum.classList.add('is-dragging');
    }
    if (moved) {
      cur = clamp(drag.start - dy / px, -0.45, N - 0.55);
      tgt = cur;
    }
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    drum.classList.remove('is-dragging');
    go(Math.round(clamp(cur, 0, N - 1)));
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // Click (or tap) a title to bring it to the window.
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (!moved) go(i);
    });
  });

  wheel.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (step) {
      e.preventDefault();
      go(Math.round(tgt) + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      go(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      go(N - 1);
    }
  });

  const refit = () => {
    measure();
    render();
  };
  window.addEventListener('resize', refit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  refit();
})();
