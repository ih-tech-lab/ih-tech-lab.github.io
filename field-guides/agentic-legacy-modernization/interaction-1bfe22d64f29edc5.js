/**
 * Progressive enhancement for Field Guide 001.
 *
 * The document is complete before this module runs: both figure compositions,
 * all four station briefs and every navigation anchor are static HTML. Three
 * refinements are added here and nothing else:
 *
 *   1. the four station anchors become a tablist over the briefs,
 *   2. the contents rail marks the section in view,
 *   3. the evidence return path draws itself once.
 *
 * Setup is wrapped so a failure leaves the static document untouched: ARIA roles
 * are applied only after the panels have all been found, and the one state that
 * hides anything is keyed off a `data-` attribute this module sets itself.
 */

const GUIDE = 'agentic-legacy-modernization';
const ROUTE_EVENT_NAMES = { exec: 'executive', tech: 'technical', act: 'action' };
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp']);
const DRAW_FALLBACK_MS = 5000;

/**
 * Sends one enumerated event through the always-on GA4 tag.
 *
 * No article text and no reader-provided value is ever sent.
 *
 * @param {string} name
 * @param {Record<string, string>} detail
 */
function track(name, detail) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, { guide: GUIDE, ...detail });
}

/** @returns {boolean} */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Collects the selector, its anchors and their panels, or `null` when the
 * document does not have the shape this enhancement expects.
 */
function collectStations() {
  const container = document.querySelector('.station-select');
  const tabs = container === null ? [] : [...container.querySelectorAll('a[data-station]')];
  const panels = tabs.map((tab) => document.getElementById(`brief-${tab.dataset.station}`));

  if (container === null || tabs.length === 0 || panels.includes(null)) return null;
  return { container, tabs, panels };
}

/**
 * Marks the station's shape in both figure compositions.
 *
 * The halo is an outline rather than a tint, so the selection stays legible in
 * greyscale and beside the tab's filled square glyph.
 *
 * @param {string} station
 */
function markFigure(station) {
  for (const group of document.querySelectorAll('#fig-loop .station')) {
    group.classList.toggle('is-selected', group.dataset.station === station);
  }
}

/**
 * Upgrades the four anchors to a tablist over the four briefs.
 *
 * Selection follows focus because the panel is a few lines of text, which is the
 * automatic-activation pattern rather than the manual one.
 *
 * @param {{ container: Element, tabs: HTMLAnchorElement[], panels: HTMLElement[] }} model
 * @returns {(index: number, options?: { focus?: boolean }) => void}
 */
function upgradeStations(model) {
  const { container, tabs, panels } = model;
  let started = false;

  // The static markup is a labelled group; only the role changes, so the label
  // stays owned by the renderer rather than duplicated here.
  container.setAttribute('role', 'tablist');

  for (const [index, tab] of tabs.entries()) {
    const panel = panels[index];
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.setAttribute('tabindex', '-1');
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('tabindex', '0');
    panel.setAttribute('aria-labelledby', tab.id);
  }

  return function select(index, options = {}) {
    const station = tabs[index].dataset.station;

    for (const [position, tab] of tabs.entries()) {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('tabindex', selected ? '0' : '-1');
      panels[position].hidden = !selected;
    }
    markFigure(station);
    if (options.focus === true) tabs[index].focus();
    if (!started) {
      started = true;
      track('guide_model_started', { station });
    }
  };
}

/**
 * Wires pointer and keyboard operation for the tablist.
 *
 * @param {{ container: Element, tabs: HTMLAnchorElement[] }} model
 * @param {(index: number, options?: { focus?: boolean }) => void} select
 */
function wireStationInput(model, select) {
  const { container, tabs } = model;

  container.addEventListener('click', (event) => {
    const tab = event.target.closest('a[data-station]');
    if (tab === null) return;
    event.preventDefault();
    select(tabs.indexOf(tab), { focus: true });
  });

  container.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(event.target.closest('a[data-station]'));
    if (current < 0) return;

    let next = current;
    if (NEXT_KEYS.has(event.key)) next = (current + 1) % tabs.length;
    else if (PREVIOUS_KEYS.has(event.key)) next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    select(next, { focus: true });
  });
}

/**
 * Lets a pointer select a station by clicking its shape in the figure.
 *
 * This is a pointer-only nicety: the figure is `role="img"`, so its subtree is
 * not exposed, and the tabs remain the accessible path.
 *
 * @param {{ tabs: HTMLAnchorElement[] }} model
 * @param {(index: number, options?: { focus?: boolean }) => void} select
 */
function wireFigureStations(model, select) {
  const figure = document.getElementById('fig-loop');
  if (figure === null) return;

  figure.dataset.tabs = 'on';
  figure.addEventListener('click', (event) => {
    const group = event.target.closest('.station');
    if (group === null) return;
    const index = model.tabs.findIndex((tab) => tab.dataset.station === group.dataset.station);
    if (index >= 0) select(index, { focus: true });
  });
}

/**
 * Draws the evidence return path once, when the reader reaches the figure.
 *
 * The trigger is the viewport's central band rather than a visibility ratio: the
 * narrow plate is taller than a phone viewport, so a ratio threshold could never
 * be met and the path would stay hidden. A timer forces the finished state as a
 * second guarantee against that.
 *
 * @param {HTMLElement} figure
 */
function installReturnPathDraw(figure) {
  if (prefersReducedMotion() || typeof IntersectionObserver !== 'function') return;

  figure.dataset.draw = 'pending';
  const finish = () => {
    figure.dataset.draw = 'done';
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      finish();
    },
    { threshold: 0, rootMargin: '-25% 0px -25% 0px' }
  );

  observer.observe(figure);
  window.setTimeout(finish, DRAW_FALLBACK_MS);
}

/** Marks the section in view in the contents rail. */
function installRailSpy() {
  const links = new Map(
    [...document.querySelectorAll('.rail-list a[href^="#"]')].map((link) => [
      link.getAttribute('href').slice(1),
      link,
    ])
  );
  const headings = [...document.querySelectorAll('main h2[id]')];
  if (links.size === 0 || headings.length === 0 || typeof IntersectionObserver !== 'function') {
    return;
  }

  const visible = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      const current = headings.map(({ id }) => id).find((id) => visible.has(id));
      for (const [id, link] of links) {
        if (current === id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-72px 0px -55% 0px' }
  );

  for (const heading of headings) observer.observe(heading);
}

/** Reports the three outbound intents the design enumerates. */
function installEventReporting() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (link === null) return;

    const route = link.dataset.route;
    if (route !== undefined) {
      track('guide_route_started', { route: ROUTE_EVENT_NAMES[route] ?? route });
      return;
    }
    const kind = link.dataset.event;
    if (kind === 'source') track('guide_source_opened', { target: link.dataset.target ?? '' });
    else if (kind === 'handoff') {
      track('guide_handoff_followed', { target: link.dataset.target ?? '' });
    }
  });
}

/**
 * Selects the station a URL fragment names, or the first one.
 *
 * @param {{ tabs: HTMLAnchorElement[] }} model
 * @param {(index: number, options?: { focus?: boolean }) => void} select
 */
function selectInitialStation(model, select) {
  const fragment = window.location.hash.replace('#', '');
  const requested = model.tabs.findIndex((tab) => `brief-${tab.dataset.station}` === fragment);
  select(requested >= 0 ? requested : 0);
}

function enhance() {
  installEventReporting();
  installRailSpy();

  const figure = document.getElementById('fig-loop');
  if (figure !== null) installReturnPathDraw(figure);

  const model = collectStations();
  if (model === null) return;

  const select = upgradeStations(model);
  wireStationInput(model, select);
  wireFigureStations(model, select);
  selectInitialStation(model, select);
}

try {
  enhance();
} catch (error) {
  console.error('[ihtech.ba] field guide enhancement disabled:', error);
}
