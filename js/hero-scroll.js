(() => {
  'use strict';

  const video = document.getElementById('hero-video');
  const heroSection = document.querySelector('.hero--photo');
  const heroContent = document.querySelector('.hero__content');
  const scrollCue = document.querySelector('.scroll-cue');
  if (!video || !heroSection) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Defensive: this video is a scroll-driven timeline, never a player.
  // If anything (extension, OS media key, stray autoplay policy) tries to
  // play it, immediately pause again.
  video.addEventListener('play', () => {
    if (!video.dataset.scrubbing) video.pause();
  });

  if (prefersReducedMotion) {
    // Respect reduced motion: show the poster/first frame only, no pinning,
    // no scroll-driven playback. The page scrolls normally.
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
      try { video.currentTime = snapped; } catch (e) { /* ignore seek errors before metadata */ }
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
      trigger: heroSection,
      start: 'top top',
      end: '+=500%',
      pin: true,
      pinSpacing: true,
      scrub: true,
      anticipatePin: 1,
      onUpdate(self) {
        target = self.progress * (video.duration || 0);
        requestRender();

        // Fade the hero copy and CTA out early in the scroll, well before
        // the video moves past its opening scene, so they never sit awkwardly
        // over later frames. Scrubs both ways with the video itself.
        const FADE_OUT_BY = 0.15;
        const fade = Math.min(self.progress / FADE_OUT_BY, 1);
        const opacity = 1 - fade;
        if (heroContent) {
          heroContent.style.opacity = opacity;
          heroContent.style.transform = `translateY(${fade * -24}px)`;
          heroContent.style.pointerEvents = opacity < 0.05 ? 'none' : '';
        }
        if (scrollCue) {
          scrollCue.style.opacity = opacity;
        }
      },
    });

    // Other pinned sections further down the page (e.g. the dolphin
    // interlude) set up their own ScrollTrigger independently, sometimes
    // before this one exists yet (its video can finish loading first).
    // Refresh once this pin exists so every trigger's start/end accounts
    // for this section's pin-spacer height — otherwise a later section can
    // end up pinning too early and overlapping this one mid-scroll.
    ScrollTrigger.refresh();
  }

  if (video.readyState >= 1 && video.duration) {
    setupScrollTrigger();
  } else {
    video.addEventListener('loadedmetadata', setupScrollTrigger, { once: true });
  }

  // iOS/Safari require a user gesture before a video will decode frames via
  // currentTime scrubbing. A silent one-time play/pause on first touch or
  // click unlocks this without ever visibly playing the video.
  function unlockDecoding() {
    const p = video.play();
    if (p && typeof p.then === 'function') {
      p.then(() => video.pause()).catch(() => {});
    }
  }
  window.addEventListener('touchstart', unlockDecoding, { once: true, passive: true });
  window.addEventListener('pointerdown', unlockDecoding, { once: true });
})();
