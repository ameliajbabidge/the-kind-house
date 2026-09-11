(() => {
  'use strict';

  // Projects: six slices side by side. The one you point at opens wide — and
  // stays open — while the others fold narrow; on a phone they stack and
  // open with a tap. Tabbing to a project's link opens its slice too.

  const panels = [...document.querySelectorAll('.work-panel')];
  if (!panels.length) return;

  const activate = (panel) => {
    if (panel.classList.contains('is-active')) return;
    panels.forEach((p) => p.classList.toggle('is-active', p === panel));
  };

  // A short pause before opening, so sweeping the mouse across the row
  // doesn't flick every slice open on the way past.
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let hoverTimer = 0;

  panels.forEach((panel) => {
    if (canHover) {
      panel.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => activate(panel), 110);
      });
      panel.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
    }
    // A closed slice opens on a click or tap; once open, its link works.
    panel.addEventListener('click', (e) => {
      if (panel.classList.contains('is-active')) return;
      e.preventDefault();
      activate(panel);
    });
    panel.addEventListener('focusin', () => activate(panel));
  });
})();
