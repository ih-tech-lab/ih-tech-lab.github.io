/**
 * Motion for ihtech.ba, built on anime.js v4 (vendored, not CDN — a landing
 * page should not hand a third party the ability to change what it runs).
 *
 * Two rules shape everything here:
 *
 * 1. **Content is never hidden by JavaScript that might not run.** The reveal
 *    states live behind `.js` on <html>, and if anything in this file throws,
 *    the catch below removes that class and every section is visible again. An
 *    animation bug must never cost a reader the page.
 * 2. **`prefers-reduced-motion` means less movement, not less information.**
 *    Reduced motion skips straight to the final state; nothing fades, nothing
 *    is withheld.
 */
import { animate, createTimeline, createDrawable, stagger, utils } from './anime.esm.js';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Show everything, unconditionally. The fallback for reduced motion and for failure. */
function revealAll() {
  root.classList.remove('js');
  for (const el of document.querySelectorAll('.reveal')) {
    el.style.opacity = '1';
    el.style.transform = 'none';
  }
}

/** Sticky header hairline, which only appears once the page has actually moved. */
function stickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([entry]) => header.setAttribute('data-stuck', String(!entry.isIntersecting)),
    { rootMargin: '0px' }
  ).observe(sentinel);
}

/**
 * The hero, on load. Words rise in sequence rather than the whole heading at
 * once — a single block fading in reads as a page that was slow, a sequence
 * reads as a page that was composed.
 */
function heroIntro() {
  const heading = document.querySelector('.hero h1');
  if (heading) {
    const words = heading.textContent.split(' ');
    heading.textContent = '';
    for (const word of words) {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform, opacity';
      heading.append(span, document.createTextNode(' '));
    }
    // The heading itself becomes visible the moment it is split; the words it
    // now contains carry the entry. Without this the whole h1 stays at the
    // stylesheet's opacity 0 and the animation plays inside an invisible box.
    utils.set(heading, { opacity: 1 });
    utils.set(heading.querySelectorAll('span'), { opacity: 0 });
  }

  createTimeline({ defaults: { ease: 'out(3)' } })
    .add('.hero .kicker', { opacity: [0, 1], y: [12, 0], duration: 600 })
    .add(
      '.hero h1 span',
      { opacity: [0, 1], y: [26, 0], duration: 850, delay: stagger(38) },
      '-=350'
    )
    .add('.hero-lead', { opacity: [0, 1], y: [16, 0], duration: 700 }, '-=550')
    .add(
      '.hero-actions .btn',
      { opacity: [0, 1], y: [14, 0], duration: 600, delay: stagger(90) },
      '-=450'
    );
}

/**
 * The orchestration diagram: edges draw themselves, nodes land, then packets
 * run the edges on a loop. The loop is the whole point — a static diagram says
 * "architecture", a moving one says "this thing is running".
 */
function heroDiagram() {
  const figure = document.querySelector('.hero-figure svg');
  if (!figure) return;

  const edges = createDrawable('.hero-figure .edge');

  createTimeline({ defaults: { ease: 'out(3)' } })
    .add('.hero-figure .hub', { opacity: [0, 1], scale: [0.82, 1], duration: 700 })
    .add(edges, { draw: ['0 0', '0 1'], duration: 900, delay: stagger(110) }, '-=350')
    .add(
      '.hero-figure .node',
      { opacity: [0, 1], scale: [0.6, 1], duration: 650, delay: stagger(90) },
      '-=700'
    )
    .add('.hero-figure .ring', { opacity: [0, 0.75], duration: 800 }, '-=600');

  animate('.hero-figure .ring', {
    rotate: 360,
    duration: 26000,
    ease: 'linear',
    loop: true,
  });

  for (const packet of document.querySelectorAll('.hero-figure .packet')) {
    const path = document.querySelector(`#${packet.dataset.edge}`);
    if (!path) continue;
    animate(packet, {
      x: [Number(path.getAttribute('x1')), Number(path.getAttribute('x2'))],
      y: [Number(path.getAttribute('y1')), Number(path.getAttribute('y2'))],
      opacity: [0, 1, 1, 0],
      duration: 2200,
      delay: Number(packet.dataset.delay ?? 0),
      loop: true,
      ease: 'inOut(2)',
    });
  }

  animate('.hero-figure .hub', {
    scale: [1, 1.04, 1],
    duration: 3600,
    loop: true,
    ease: 'inOut(2)',
  });
}

/**
 * Everything below the fold arrives when it is scrolled to, once.
 *
 * Deliberately an `IntersectionObserver` rather than anime's own `onScroll`:
 * the trigger here is "in view, play once, never again", which the platform
 * observer states exactly, and one `unobserve` guarantees it. Scroll-linked
 * scrubbing would be the reason to reach for `onScroll`, and nothing here
 * scrubs.
 *
 * @param {Array<{ selector: string, y?: number, scale?: number, gap: number }>} groups
 */
function revealOnScroll(groups) {
  const observer = new IntersectionObserver(
    (entries, self) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const group = groups.find((g) => entry.target.matches(g.selector));
        if (!group) continue;
        const peers = [...document.querySelectorAll(group.selector)].filter((el) =>
          el.parentElement === entry.target.parentElement
        );
        animate(peers, {
          opacity: [0, 1],
          ...(group.y === undefined ? {} : { y: [group.y, 0] }),
          ...(group.scale === undefined ? {} : { scale: [group.scale, 1] }),
          duration: group.scale === undefined ? 750 : 520,
          delay: stagger(group.gap),
          ease: 'out(3)',
        });
        for (const peer of peers) self.unobserve(peer);
      }
    },
    { rootMargin: '0px 0px -80px 0px', threshold: 0.05 }
  );

  for (const group of groups) {
    for (const el of document.querySelectorAll(group.selector)) observer.observe(el);
  }

  // Safety net. `.reveal` is opacity 0 until something animates it, so a new
  // element that nobody added to `groups` renders as blank space — a silent,
  // total content loss that no error surfaces. Anything left over gets the
  // default treatment rather than nothing.
  const covered = new Set(groups.flatMap((g) => [...document.querySelectorAll(g.selector)]));
  const orphans = [...document.querySelectorAll('.reveal')].filter((el) => !covered.has(el));
  if (orphans.length > 0) {
    groups.push({ selector: '.reveal', y: 20, gap: 60 });
    for (const el of orphans) observer.observe(el);
  }
}

try {
  if (reduced) {
    revealAll();
    stickyHeader();
  } else {
    stickyHeader();
    heroIntro();
    heroDiagram();
    revealOnScroll([
      { selector: '.section-head', y: 20, gap: 0 },
      { selector: '.card', y: 28, gap: 70 },
      { selector: '.step', y: 22, gap: 80 },
      { selector: '.stack-group', y: 20, gap: 90 },
      { selector: '.community', y: 24, gap: 0 },
      { selector: '.chips li', scale: 0.92, gap: 24 },
      { selector: '.contact-panel', y: 24, gap: 0 },
    ]);
  }
} catch (error) {
  // An animation failure must degrade to a readable page, never to a blank one.
  revealAll();
  console.error('[ihtech.ba] motion disabled:', error);
}
