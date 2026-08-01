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
import {
  createTimeline,
  createDrawable,
  createMotionPath,
  cubicBezier,
  stagger,
  utils,
} from './anime.esm.js';

const root = document.documentElement;
let signatureEase;
let settleEase;

/** Show everything, unconditionally. The fallback for reduced motion and for failure. */
function revealAll() {
  root.classList.remove('js');

  for (const el of document.querySelectorAll(
    '.hero-figure .guide, .hero-figure .edge, .hero-figure .ring, .hero-figure .egress, .hero-figure .hub, .hero-figure .node, .hero-figure .packet, .method-route, .route-port, .contact-node, .chips li'
  )) {
    el.style.removeProperty('opacity');
    el.style.removeProperty('transform');
    el.style.removeProperty('stroke-dasharray');
    el.style.removeProperty('stroke-dashoffset');
    el.removeAttribute('stroke-dasharray');
    el.removeAttribute('stroke-dashoffset');
  }

  for (const el of document.querySelectorAll('.reveal, .hero h1 span')) {
    el.style.opacity = '1';
    el.style.transform = 'none';
  }
}

// The head's tiny classic-script guard can call this even when an animation
// fails after setup. Module-load failures still fall back by removing `.js`.
window.__ihRevealAll = revealAll;

/** Disable motion after an asynchronous failure without losing page content. */
function disableMotion(error) {
  revealAll();
  console.error('[ihtech.ba] motion disabled:', error);
}

/** Keep the sticky header visually quiet until it separates from the page. */
function stickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const sentinel = document.createElement('span');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText =
    'position:absolute;inset-block-start:0;inline-size:1px;block-size:1px;pointer-events:none';
  header.before(sentinel);
  header.setAttribute('data-stuck', 'false');

  new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      const nextState = String(!entry.isIntersecting);
      if (header.getAttribute('data-stuck') !== nextState) {
        header.setAttribute('data-stuck', nextState);
      }
    },
    { rootMargin: '-1px 0px 0px 0px' }
  ).observe(sentinel);
}

/**
 * The hero, on load. Words rise in sequence rather than the whole heading at
 * once — a single block fading in reads as a page that was slow, a sequence
 * reads as a page that was composed.
 */
function heroIntro() {
  const heading = document.querySelector('.hero h1');
  let wordCount = 0;
  if (heading) {
    const words = heading.textContent.trim().split(/\s+/);
    wordCount = words.length;
    heading.textContent = '';
    for (const word of words) {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.display = 'inline-block';
      heading.append(span, document.createTextNode(' '));
    }
    // The heading itself becomes visible the moment it is split; the words it
    // now contains carry the entry. Without this the whole h1 stays at the
    // stylesheet's opacity 0 and the animation plays inside an invisible box.
    utils.set(heading, { opacity: 1 });
    utils.set(heading.querySelectorAll('span'), { opacity: 0 });
  }

  const wordGap = wordCount > 1 ? Math.min(36, 360 / (wordCount - 1)) : 0;
  createTimeline({ defaults: { ease: signatureEase } })
    .add('.hero .kicker', { opacity: [0, 1], y: [10, 0], duration: 420 })
    .add(
      '.hero h1 span',
      { opacity: [0, 1], y: [18, 0], duration: 620, delay: stagger(wordGap) },
      '-=220'
    )
    .add('.hero-lead', { opacity: [0, 1], y: [12, 0], duration: 480 }, '-=380')
    .add(
      '.hero-actions .btn',
      { opacity: [0, 1], y: [10, 0], duration: 380, delay: stagger(80) },
      '-=260'
    );
}

/** Run the orchestration diagram through one finite setup, action and resolution. */
function heroDiagram() {
  const figure = document.querySelector('.hero-figure svg');
  if (!figure) return;

  const guides = createDrawable('.hero-figure .guide');
  const edges = createDrawable('.hero-figure .edge');
  const ring = createDrawable('.hero-figure .ring');
  const egress = createDrawable('.hero-figure .egress');
  const timeline = createTimeline({ defaults: { ease: signatureEase } })
    .add(guides, {
      draw: ['0 0', '0 1'],
      opacity: [0, 0.78],
      duration: 420,
      delay: stagger(60),
    })
    .add('.hero-figure .hub', { opacity: [0, 1], scale: [0.94, 1], duration: 520 }, '-=260')
    .add(edges, { draw: ['0 0', '0 1'], duration: 640, delay: stagger(70) }, '-=220')
    .add(
      '.hero-figure .node',
      { opacity: [0, 1], scale: [0.9, 1], duration: 440, delay: stagger(64) },
      '-=440'
    )
    .add(ring, { draw: ['0 0', '0 1'], opacity: [0, 0.64], duration: 460 }, '-=300');

  const packets = [...figure.querySelectorAll('.packet')];
  for (const [index, packet] of packets.entries()) {
    const path = figure.querySelector(`#${packet.dataset.edge}`);
    if (!path) continue;
    timeline.add(
      packet,
      {
        ...createMotionPath(path),
        opacity: [0, 1, 1, 0],
        duration: 880,
        ease: settleEase,
      },
      1120 + index * 76
    );
  }

  timeline.add(
    '.hero-figure .hub',
    { scale: [1, 1.018, 1], duration: 520, ease: settleEase },
    1880
  );
  timeline.add(egress, { draw: ['0 0', '0 1'], duration: 380 }, 1920);
}

/** Play one reveal group and its optional route detail as a single event. */
function playRevealGroup(entry, group) {
  const peers = [...document.querySelectorAll(group.selector)].filter(
    (el) => el.parentElement === entry.target.parentElement
  );
  const detailRoots = group.detailRoot === 'parent' ? [entry.target.parentElement] : peers;
  const details = group.detail
    ? detailRoots.flatMap((el) => (el ? [...el.querySelectorAll(group.detail)] : []))
    : [];
  let detailTransform = { scale: [0.84, 1] };
  if (group.detailAxis === 'x') detailTransform = { scaleX: [0, 1] };
  if (group.detailAxis === 'route') {
    detailTransform = window.matchMedia('(max-width: 820px)').matches
      ? { scaleY: [0, 1] }
      : { scaleX: [0, 1] };
  }
  const peerGap = peers.length > 1 ? Math.min(group.gap, 360 / (peers.length - 1)) : 0;
  const detailGap = details.length > 1 ? Math.min(32, 300 / (details.length - 1)) : 0;
  const timeline = createTimeline({ defaults: { ease: signatureEase } }).add(peers, {
    opacity: [0, 1],
    ...(group.x === undefined ? {} : { x: [group.x, 0] }),
    ...(group.y === undefined ? {} : { y: [group.y, 0] }),
    ...(group.scale === undefined ? {} : { scale: [group.scale, 1] }),
    duration: group.scale === undefined ? 460 : 360,
    delay: stagger(peerGap),
  });
  if (details.length > 0) {
    timeline.add(
      details,
      {
        opacity: [0, 1],
        ...detailTransform,
        duration: 320,
        delay: stagger(detailGap),
      },
      '-=180'
    );
  }
  return peers;
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
 * @param {Array<{ selector: string, x?: number, y?: number, scale?: number, gap: number, initial?: boolean, detail?: string, detailRoot?: 'parent', detailAxis?: 'x' | 'route' }>} groups
 */
function revealOnScroll(groups) {
  const played = new WeakSet();
  const observer = new IntersectionObserver(
    (entries, self) => {
      try {
        for (const entry of entries) {
          if (!entry.isIntersecting || played.has(entry.target)) continue;
          const group = groups.find((g) => entry.target.matches(g.selector));
          if (!group) continue;
          const peers = playRevealGroup(entry, group);
          for (const peer of peers) {
            played.add(peer);
            self.unobserve(peer);
          }
        }
      } catch (error) {
        self.disconnect();
        disableMotion(error);
      }
    },
    { rootMargin: '0px 0px -80px 0px', threshold: 0.05 }
  );

  for (const group of groups) {
    if (group.initial) continue;
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
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  signatureEase = cubicBezier(0.2, 0, 0, 1);
  settleEase = cubicBezier(0.4, 0, 0.2, 1);

  if (reduced) {
    revealAll();
    stickyHeader();
  } else {
    stickyHeader();
    heroIntro();
    heroDiagram();
    revealOnScroll([
      {
        selector: '.hero .kicker, .hero h1, .hero-lead, .hero-actions .btn',
        gap: 0,
        initial: true,
      },
      { selector: '.section-head', y: 16, gap: 0 },
      { selector: '.card', y: 20, gap: 64, detail: '.route-port' },
      {
        selector: '.step',
        y: 18,
        gap: 72,
        detail: '.method-route',
        detailRoot: 'parent',
        detailAxis: 'route',
      },
      { selector: '.stack-group', y: 16, gap: 70, detail: '.chips li' },
      { selector: '.production-lead', y: 16, gap: 0 },
      { selector: '.production-item', y: 16, gap: 55 },
      { selector: '.production-note', y: 14, gap: 0 },
      { selector: '.production-cta', y: 14, gap: 0 },
      { selector: '.markets-lead', y: 16, gap: 0 },
      { selector: '.market', y: 20, gap: 70 },
      { selector: '.community', y: 18, gap: 0 },
      { selector: '.contact-panel', y: 18, gap: 0, detail: '.contact-node' },
    ]);
  }
} catch (error) {
  // An animation failure must degrade to a readable page, never to a blank one.
  disableMotion(error);
} finally {
  window.__ihMotionReady = true;
}
