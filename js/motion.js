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

  // ---------- Image parallax ----------
  // Each image is scaled up slightly so its container (which clips overflow)
  // can mask a small vertical drift as the page scrolls past it.
  const parallaxImgs = [
    ...document.querySelectorAll('.about__visual img'),
    ...document.querySelectorAll('.work-card__media img'),
  ];
  parallaxImgs.forEach((img) => {
    const container = img.closest('.about__visual, .work-card__media');
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
        },
      }
    );
  });

  // ---------- Sun icon, slow rotation tied to scroll ----------
  const sun = document.querySelector('.about-intro__sun');
  if (sun) {
    gsap.to(sun, {
      rotate: 50,
      ease: 'none',
      scrollTrigger: {
        trigger: '#services',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

})();
