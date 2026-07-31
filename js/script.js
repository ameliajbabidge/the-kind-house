(() => {
  'use strict';

  // ---------- Header height -> CSS var + scrolled state ----------
  const header = document.getElementById('site-header');
  const setHeaderHeightVar = () => {
    if (header) document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  };
  setHeaderHeightVar();
  window.addEventListener('resize', setHeaderHeightVar);

  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------- Header: visible over the hero, fades away at the second section ----------
  const photoHero = document.querySelector('.hero--photo');
  if (header && photoHero && 'IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(
      ([entry]) => header.classList.toggle('header-hidden', !entry.isIntersecting),
      { threshold: 0 }
    );
    heroObserver.observe(photoHero);
  }

  // ---------- Mobile nav toggle ----------
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- Scroll reveal ----------
  const revealEls = document.querySelectorAll('[data-reveal]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
    // Safety net: never leave content permanently invisible if the observer
    // never fires (backgrounded tab, throttling, etc).
    window.setTimeout(() => {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    }, 2500);
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // ---------- Contact form ----------
  const form = document.getElementById('contact-form');
  const status = document.getElementById('contact-status');

  if (form && status) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        status.textContent = 'Please fill in the required fields.';
        form.reportValidity();
        return;
      }

      const submitBtn = form.querySelector('.form__submit');
      const label = submitBtn.querySelector('.btn-label');
      const originalLabel = label.textContent;

      submitBtn.disabled = true;
      label.textContent = 'Sending…';

      // Submits to the Formspree endpoint set in the form's action attribute.
      // Replace the placeholder form ID in index.html before launch.
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      })
        .then((res) => {
          status.textContent = res.ok
            ? "Thank you — we'll be in touch shortly."
            : 'Something went wrong. Please try again or email us directly.';
          if (res.ok) form.reset();
        })
        .catch(() => {
          status.textContent = 'Something went wrong. Please try again or email us directly.';
        })
        .finally(() => {
          label.textContent = originalLabel;
          submitBtn.disabled = false;
        });
    });
  }

  // ---------- Footer year ----------
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
