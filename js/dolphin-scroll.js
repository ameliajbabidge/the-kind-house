(() => {
  'use strict';

  const video = document.getElementById('dolphin-video');
  const section = document.querySelector('.dolphin-scroll');
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
      },
    });
  }

  if (video.readyState >= 1 && video.duration) {
    setupScrollTrigger();
  } else {
    video.addEventListener('loadedmetadata', setupScrollTrigger, { once: true });
  }

  function unlockDecoding() {
    const p = video.play();
    if (p && typeof p.then === 'function') {
      p.then(() => video.pause()).catch(() => {});
    }
  }
  window.addEventListener('touchstart', unlockDecoding, { once: true, passive: true });
  window.addEventListener('pointerdown', unlockDecoding, { once: true });
})();
