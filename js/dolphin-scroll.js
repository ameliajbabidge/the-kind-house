(() => {
  'use strict';

  const video = document.getElementById('dolphin-video');
  const section = video ? video.closest('.dolphin-scroll') : null;
  if (!video || !section) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Once scroll has moved past the pin, the clip is handed off to play for
  // real (see onLeave/onEnterBack below) instead of staying frozen on its
  // last scrubbed frame — this flag is what lets that real playback past
  // the "scrubbing" guard below.
  let allowPlayback = false;

  video.addEventListener('play', () => {
    if (!video.dataset.scrubbing && !allowPlayback) video.pause();
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
        // The About photo and text sit over the video for the whole pin
        // (see .dolphin-scroll__about) — scrolling only moves the film.
        target = self.progress * (video.duration || 0);
        requestRender();
      },
      onLeave() {
        // Scrolled past the end of the pin — let the clip keep playing for
        // real, rather than freezing on its last scrubbed frame, for as
        // long as it's still visible.
        allowPlayback = true;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        const p = video.play();
        if (p && typeof p.then === 'function') p.catch(() => {});
      },
      onEnterBack(self) {
        // Scrolled back up into the pin range — hand control back to the
        // scrub.
        allowPlayback = false;
        video.pause();
        target = self.progress * (video.duration || 0);
        requestRender();
      },
    });

  }

  // Once the section has scrolled fully out of view, there's no reason for
  // the handed-off playback to keep running.
  new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting && allowPlayback) video.pause();
    });
  }, { threshold: 0 }).observe(section);

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
