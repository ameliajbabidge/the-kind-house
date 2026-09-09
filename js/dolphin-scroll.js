(() => {
  'use strict';

  const video = document.getElementById('dolphin-video');
  const section = video ? video.closest('.dolphin-scroll') : null;
  const aboutOverlay = section ? section.querySelector('.dolphin-scroll__about') : null;
  if (!video || !section) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  video.addEventListener('play', () => {
    if (!video.dataset.scrubbing) video.pause();
  });

  if (prefersReducedMotion) {
    video.pause();
    return;
  }

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const FPS = 24;
  const FRAME = 1 / FPS;

  let target = 0;
  let current = 0;
  let rafId = null;
  let ready = false;

  function renderLoop() {
    current += (target - current) * 0.24;
    if (Math.abs(target - current) < 0.004) current = target;

    const clamped = Math.min(Math.max(current, 0), video.duration || 0);
    const snapped = Math.round(clamped / FRAME) * FRAME;

    if (Math.abs(video.currentTime - snapped) > 0.004) {
      video.dataset.scrubbing = 'true';
      try { video.currentTime = snapped; } catch (e) {}
      delete video.dataset.scrubbing;
    }

    if (current !== target) {
      rafId = requestAnimationFrame(renderLoop);
    } else {
      rafId = null;
    }
  }

  function requestRender() {
    if (!rafId) rafId = requestAnimationFrame(renderLoop);
  }

  function setupScrollTrigger() {
    if (ready) return;
    ready = true;

    video.pause();
    video.currentTime = 0;

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=250%',
      pin: true,
      pinSpacing: true,
      scrub: true,
      anticipatePin: 1,
      onUpdate(self) {
        target = self.progress * (video.duration || 0);
        requestRender();

        // The About photo and text rise up from below the frame as the
        // dolphin's video is finishing — the breach and jump play out
        // underneath it while it climbs — and hold in place once fully up,
        // so the pin only releases once it's settled and the video keeps
        // running behind it. It's always fully opaque; visibility comes
        // entirely from the rise, never a fade.
        if (aboutOverlay) {
          const RISE_FROM = 0.78;
          const RISE_TO = 0.94;
          const riseIn = Math.min(Math.max((self.progress - RISE_FROM) / (RISE_TO - RISE_FROM), 0), 1);
          aboutOverlay.style.transform = `translateY(${(1 - riseIn) * 100}%)`;
          aboutOverlay.style.pointerEvents = riseIn > 0.5 ? 'auto' : 'none';
        }
      },
    });

  }

  // See hero-scroll.js for why this registers instead of setting up
  // immediately: pinned sections need to be created together, in page
  // order, once every video on the page is ready.
  window.__ktScrollVideos = window.__ktScrollVideos || [];
  window.__ktScrollVideos.push({
    ready:
      video.readyState >= 1 && video.duration
        ? Promise.resolve()
        : new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true })),
    setup: setupScrollTrigger,
  });

  function unlockDecoding() {
    const p = video.play();
    if (p && typeof p.then === 'function') {
      p.then(() => video.pause()).catch(() => {});
    }
  }
  window.addEventListener('touchstart', unlockDecoding, { once: true, passive: true });
  window.addEventListener('pointerdown', unlockDecoding, { once: true });
})();
