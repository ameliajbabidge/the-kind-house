(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Scroll progress bar ----------
  const progressBar = document.querySelector('.scroll-progress__bar');
  if (progressBar) {
    let ticking = false;
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(Math.max((scrollTop / docHeight) * 100, 0), 100) : 0;
      progressBar.style.width = `${pct}%`;
      ticking = false;
    };
    updateProgress();
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(updateProgress);
          ticking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', updateProgress);
  }

  // ---------- Staggered grid reveals ----------
  // Gives each card in a grid a slightly later transition-delay than the one
  // before it, so rows cascade in rather than appearing all at once.
  const staggerGrids = document.querySelectorAll(
    '.services__grid, .testimonials__grid, .work__grid, .journal__grid, .journal-index__grid, ' +
      '.process__steps'
  );
  staggerGrids.forEach((grid) => {
    const items = grid.querySelectorAll(':scope > [data-reveal]');
    items.forEach((item, i) => {
      item.style.transitionDelay = `${Math.min(i, 5) * 90}ms`;
    });
  });

  // ---------- What I Do: the copy arrives top to bottom ----------
  // The heading rises in first, then each paragraph follows a beat after
  // the one above it, so the text unfolds down the page as you arrive.
  document.querySelectorAll('.about-intro__copy > [data-reveal]').forEach((p, i) => {
    p.style.transitionDelay = `${150 + i * 140}ms`;
  });

  // ---------- Letter-by-letter hover wave on the How I Work step titles ----------
  document.querySelectorAll('.process__body h3').forEach((h3) => {
    const text = h3.textContent;
    h3.textContent = '';
    h3.setAttribute('aria-label', text);
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.setProperty('--i', i);
      span.setAttribute('aria-hidden', 'true');
      h3.appendChild(span);
    });
  });

  // ---------- 3D tilt on the project photos ----------
  // Hovering a project photo tips it in 3D as if you were pressing into it
  // under the pointer: the side under the cursor dips away, a soft glare
  // follows it, the shadow falls the other way, and the image drifts
  // opposite inside its frame, like looking through a window. Everything is
  // eased, so it glides rather than jumps. Mouse/trackpad only.
  if (!prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const MAX_X = 8; // degrees, tipping forward/back
    const MAX_Y = 10; // degrees, turning left/right
    document.querySelectorAll('.work-card__media').forEach((media) => {
      const cur = { x: 0, y: 0, on: 0 };
      const tgt = { x: 0, y: 0, on: 0 }; // x, y from -0.5 to 0.5 across the photo
      let raf = 0;
      const tick = () => {
        cur.x += (tgt.x - cur.x) * 0.12;
        cur.y += (tgt.y - cur.y) * 0.12;
        cur.on += (tgt.on - cur.on) * 0.12;
        const s = media.style;
        s.setProperty('--tilt-x', `${(-cur.y * MAX_X * 2).toFixed(2)}deg`);
        s.setProperty('--tilt-y', `${(cur.x * MAX_Y * 2).toFixed(2)}deg`);
        s.setProperty('--tilt-on', cur.on.toFixed(3));
        s.setProperty('--glare-x', `${((cur.x + 0.5) * 100).toFixed(1)}%`);
        s.setProperty('--glare-y', `${((cur.y + 0.5) * 100).toFixed(1)}%`);
        s.setProperty('--depth-x', `${(-cur.x * 18).toFixed(1)}px`);
        s.setProperty('--depth-y', `${(-cur.y * 14).toFixed(1)}px`);
        s.setProperty('--tilt-sx', `${(-cur.x * 26).toFixed(1)}px`);
        s.setProperty('--tilt-sy', `${(18 - cur.y * 16 + cur.on * 12).toFixed(1)}px`);
        const moving = Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) + Math.abs(tgt.on - cur.on) > 0.002;
        raf = moving ? requestAnimationFrame(tick) : 0;
      };
      const kick = () => {
        if (!raf) raf = requestAnimationFrame(tick);
      };
      media.addEventListener('pointermove', (e) => {
        const r = media.getBoundingClientRect();
        tgt.x = (e.clientX - r.left) / r.width - 0.5;
        tgt.y = (e.clientY - r.top) / r.height - 0.5;
        tgt.on = 1;
        kick();
      });
      media.addEventListener('pointerleave', () => {
        tgt.x = 0;
        tgt.y = 0;
        tgt.on = 0;
        kick();
      });
    });
  }

  // ---------- Pause the services fabric while it's off screen ----------
  // Its drifting folds only need to move while you can see them.
  const servicesBand = document.querySelector('.services__band');
  if (servicesBand && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => servicesBand.classList.toggle('is-offscreen', !entry.isIntersecting));
    }).observe(servicesBand);
  }

  if (prefersReducedMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Every scroll-scrubbed video section (hero, dolphin, bird, ...) registers
  // itself in window.__ktScrollVideos instead of setting up independently —
  // see hero-scroll.js for why. Create all of their pins together, in page
  // order, once every one of their videos is ready. The intro statement
  // and the About photo/text now live inside the hero's and dolphin
  // video's own overlays (see hero-scroll.js / dolphin-scroll.js) instead
  // of separate scroll-triggered reveals here.
  const scrollVideos = window.__ktScrollVideos || [];
  if (scrollVideos.length) {
    Promise.all(scrollVideos.map((v) => v.ready)).then(() => {
      scrollVideos.forEach((v) => v.setup());
      ScrollTrigger.refresh();
    });
  }

  // Late-loading fonts/images can still shift section heights after that.
  // One more refresh once the whole page has loaded keeps everything in
  // sync with the real, final layout.
  window.addEventListener('load', () => ScrollTrigger.refresh());

  // Web fonts can finish swapping in even after the load event (this is
  // what was leaving a stale gap at the bottom of a pinned video section —
  // the pin's scroll distance had been measured against the fallback
  // font's slightly shorter text). Refresh again once the real fonts land.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  // ---------- Image parallax ----------
  // Each image is scaled up slightly so its container (which clips overflow)
  // can mask a small vertical drift as the page scrolls past it.
  // (The About portrait is left out on purpose: it sits still over the
  // pinned dolphin video, where only the film should move.)
  const parallaxImgs = [...document.querySelectorAll('.work-card__media img')];
  parallaxImgs.forEach((img) => {
    const container = img.closest('.work-card__media');
    if (!container) return;
    gsap.set(img, { scale: 1.15, transformOrigin: 'center center' });
    gsap.fromTo(
      img,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          refreshPriority: -1, // after the pins — see the sun below
        },
      }
    );
  });

  // ---------- What I Do sun: spins as you scroll ----------
  // One and a half turns across the time the What I Do row is on screen,
  // with a little smoothing so it glides to a stop when you stop scrolling.
  const sun = document.querySelector('.about-intro__sun');
  if (sun) {
    gsap.to(sun, {
      rotate: 540,
      ease: 'none',
      scrollTrigger: {
        trigger: '.about-intro-row',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.2,
        // Created before the pinned video sections exist (they wait for
        // their videos) — refresh after them, so the start/end include
        // their pin spacing instead of being thousands of px too early.
        refreshPriority: -1,
      },
    });
  }

})();
