(() => {
  'use strict';

  const video = document.getElementById('hero-video');
  const heroSection = document.querySelector('.hero--photo');
  const heroContent = document.querySelector('.hero__content');
  const scrollCue = document.querySelector('.scroll-cue');
  const introOverlay = document.querySelector('.hero__intro-overlay');
  const introLines = document.querySelectorAll('.hero__intro-overlay .intro__statement-line');
  const introLine1 = introLines[0];
  const introLine2 = introLines[1];
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

        // "Home isn't a place." appears the moment the cave opens onto the
        // lake, holds through that view, then clears away before the dive.
        // "It's a feeling." only fades in once the footage has fully cut
        // underwater (the splash and surface shots stay clear of it), and
        // holds through the end of the clip, so the pin only releases once
        // it's fully settled.
        if (introLine1 && introLine2) {
          const L1_IN_FROM = 0.445;
          const L1_IN_TO = 0.499;
          const L1_OUT_FROM = 0.652;
          const L1_OUT_TO = 0.691;
          const L2_IN_FROM = 0.868;
          const L2_IN_TO = 0.898;

          const l1In = Math.min(Math.max((self.progress - L1_IN_FROM) / (L1_IN_TO - L1_IN_FROM), 0), 1);
          const l1Out = Math.min(Math.max((self.progress - L1_OUT_FROM) / (L1_OUT_TO - L1_OUT_FROM), 0), 1);
          const l1 = l1In * (1 - l1Out);
          const l2 = Math.min(Math.max((self.progress - L2_IN_FROM) / (L2_IN_TO - L2_IN_FROM), 0), 1);

          introLine1.style.opacity = l1;
          introLine2.style.opacity = l2;
          if (introOverlay) {
            introOverlay.style.pointerEvents = Math.max(l1, l2) > 0.5 ? 'auto' : 'none';
          }
        }
      },
    });

  }

  // All scroll-scrubbed video sections on the page register here instead of
  // setting up the moment their own video is ready. Creating a pinned
  // ScrollTrigger before an earlier pinned section's pin-spacer has reached
  // its final height gives it a wrong start position that a later refresh()
  // doesn't fully correct — especially when two pinned sections sit back to
  // back with nothing in between. Waiting for every video to be ready, then
  // creating all the pins together in page order, avoids that entirely.
  window.__ktScrollVideos = window.__ktScrollVideos || [];
  window.__ktScrollVideos.push({
    ready:
      video.readyState >= 1 && video.duration
        ? Promise.resolve()
        : new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true })),
    setup: setupScrollTrigger,
  });

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
