(() => {
  'use strict';

  // How I Work as the sun's arc across the day: the four steps sit as
  // stations along a big arc, sunrise to sunset. The section holds still
  // while you scroll and a honey line draws itself along the arc; the step
  // it reaches lights up and its words appear in the middle of the arc.
  // Clicking a station glides the page there. On phones, with reduced
  // motion, or without GSAP, the original list stays as it is.

  const section = document.getElementById('process');
  const wrap = section ? section.querySelector('.process') : null;
  const steps = wrap ? [...wrap.querySelectorAll('.process__step')] : [];
  if (!wrap || steps.length < 2) return;

  // Where each step sits along the arc: 0 = sunrise (left) … 1 = sunset (right).
  const STATIONS = steps.map((_, i) => 0.08 + (0.84 * i) / (steps.length - 1));
  const FIRST = STATIONS[0];
  const LAST = STATIONS[STATIONS.length - 1];

  function setup() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    if (window.matchMedia('(max-width: 899px)').matches) return;

    wrap.classList.add('is-arc');
    section.classList.add('has-arc');

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'process__arc');
    svg.setAttribute('aria-hidden', 'true');
    // The horizon fades out at both ends rather than stopping dead.
    const defs = document.createElementNS(NS, 'defs');
    const fade = document.createElementNS(NS, 'linearGradient');
    fade.setAttribute('id', 'process-horizon-fade');
    fade.setAttribute('gradientUnits', 'userSpaceOnUse');
    [[0, 0], [0.18, 1], [0.82, 1], [1, 0]].forEach(([offset, opacity]) => {
      const stop = document.createElementNS(NS, 'stop');
      stop.setAttribute('offset', String(offset));
      stop.setAttribute('stop-color', '#2e2b28');
      stop.setAttribute('stop-opacity', String(opacity * 0.2));
      fade.append(stop);
    });
    defs.append(fade);
    svg.append(defs);
    const horizon = document.createElementNS(NS, 'line');
    horizon.setAttribute('class', 'process__horizon');
    const base = document.createElementNS(NS, 'path');
    base.setAttribute('class', 'process__arc-base');
    const trail = document.createElementNS(NS, 'path');
    trail.setAttribute('class', 'process__arc-trail');
    trail.setAttribute('pathLength', '1');
    svg.append(horizon, base, trail);

    wrap.prepend(svg);

    // The whole section warms towards butter yellow as the line travels
    // from the first step to the last.
    const warmth = document.createElement('div');
    warmth.className = 'process__warmth';
    warmth.setAttribute('aria-hidden', 'true');
    section.prepend(warmth);

    // A small label under each station (the title itself shows in the middle
    // of the arc once the line reaches that step).
    steps.forEach((step) => {
      const title = step.querySelector('h3');
      const label = document.createElement('span');
      label.className = 'process__label';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = title ? title.getAttribute('aria-label') || title.textContent : '';
      step.append(label);
    });

    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let t = FIRST; // how far along the arc the line has drawn

    const point = (tt, r) => [cx + r * Math.cos(Math.PI * (1 - tt)), cy - r * Math.sin(Math.PI * (1 - tt))];

    function render() {
      trail.style.strokeDashoffset = String(1 - t);
      warmth.style.opacity = ((t - FIRST) / (LAST - FIRST)).toFixed(3);
      let active = 0;
      let best = Infinity;
      STATIONS.forEach((s, i) => {
        const d = Math.abs(t - s);
        if (d < best) {
          best = d;
          active = i;
        }
      });
      steps.forEach((step, i) => {
        step.classList.toggle('is-active', i === active);
        step.classList.toggle('is-passed', i < active);
      });
    }

    function layout() {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      cx = W / 2;
      cy = H - 70; // the horizon
      R = Math.min(W * 0.42, H - 150);
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const [x0, y0] = point(0, R);
      const [x1, y1] = point(1, R);
      const d = `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      base.setAttribute('d', d);
      trail.setAttribute('d', d);
      horizon.setAttribute('x1', '0');
      horizon.setAttribute('x2', String(W));
      horizon.setAttribute('y1', cy.toFixed(1));
      horizon.setAttribute('y2', cy.toFixed(1));
      fade.setAttribute('x1', '0');
      fade.setAttribute('x2', String(W));
      steps.forEach((step, i) => {
        const [x, y] = point(STATIONS[i], R);
        step.style.setProperty('--x', `${x.toFixed(1)}px`);
        step.style.setProperty('--y', `${y.toFixed(1)}px`);
        // Each name sits on the inner side of its station, pointing towards
        // the middle of the arc, so the arc's line never runs through it.
        const a = Math.PI * (1 - STATIONS[i]);
        const ix = -Math.cos(a);
        const iy = Math.sin(a);
        step.style.setProperty('--lx', `${(x + ix * 38).toFixed(1)}px`);
        step.style.setProperty('--ly', `${(y + iy * 38).toFixed(1)}px`);
        step.style.setProperty('--ax', `${(-50 + 50 * ix).toFixed(1)}%`);
        step.style.setProperty('--ay', `${(-50 + 50 * iy).toFixed(1)}%`);
      });
      wrap.style.setProperty('--body-top', `${(cy - R * 0.64).toFixed(1)}px`);
      render();
    }

    layout();

    const st = ScrollTrigger.create({
      trigger: section,
      start: () => (section.offsetHeight > window.innerHeight ? 'top top' : 'center center'),
      end: '+=160%',
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      onUpdate(self) {
        t = FIRST + (LAST - FIRST) * self.progress;
        render();
      },
      onRefresh: layout,
    });

    // Clicking a station glides the page to it, drawing the line there.
    steps.forEach((step, i) => {
      const go = () => {
        const p = (STATIONS[i] - FIRST) / (LAST - FIRST);
        window.scrollTo({ top: st.start + p * (st.end - st.start), behavior: 'smooth' });
      };
      const marker = step.querySelector('.process__marker');
      const label = step.querySelector('.process__label');
      if (marker) marker.addEventListener('click', go);
      if (label) label.addEventListener('click', go);
    });
  }

  // Pinned sections are created together, in page order, once every one of
  // them is ready (see hero-scroll.js) — this sits between the dolphin and
  // the bird, so its script is loaded between theirs.
  window.__ktScrollVideos = window.__ktScrollVideos || [];
  window.__ktScrollVideos.push({ ready: Promise.resolve(), setup });
})();
