/**
 * Progressive enhancement for Field Guide 002.
 *
 * The document is complete before this module runs, and so is the instrument:
 * the custody line, the resolved level, the marks and the reset button are all
 * driven by `:has()` in the stylesheet, so a reader with JavaScript disabled
 * still watches two strong axes fail to lift a level. Added here and nothing
 * else: the verdict's diagnosis and its keyed quotation, one polite
 * announcement, the rail's current-section marking, four enumerated events.
 *
 * The four diagnosis sentences live here rather than in the document because a
 * CSS matrix for them would put four editorial sentences into the DOM at all
 * times. Each is verbatim from `content.md`; the axis and tier names are read
 * back out of the document, so this module cannot disagree with the table.
 */

const GUIDE = 'ai-native-leveling-ladder';
const AXIS_KEYS = ['span', 'judgment', 'formation'];

/**
 * Tie-break order for the keyed sentence: formation, then judgment, then span.
 *
 * The content argues that formation is the axis the field is eroding and the one
 * that collapses exactly where custody matters most, and it treats judgment as
 * the skill the role exercises daily above span.
 */
const PRIORITY = ['formation', 'judgment', 'span'];

const DIAGNOSES = {
  agree: {
    limiting: 'All three axes agree.',
    action: 'The level is settled at this tier.',
    sentence:
      'A level requires all three at that tier; the axes are deliberately non-substitutable, because each one covers a specific failure the other two permit.',
    sourceId: 'the-three-axes',
    sourceName: 'The three axes',
  },
  formation: {
    limiting: 'Formation depth is the limiting axis.',
    action: 'Run the reconstruction test.',
    sentence:
      'A person who passes slop tests but fails reconstruction is not ready for the custody tier; they are ready for more formation.',
    sourceId: 'the-three-tests',
    sourceName: 'The three tests',
  },
  judgment: {
    limiting: 'Judgment under agency is the limiting axis.',
    action: 'Run the slop test.',
    sentence:
      'What separates engineers now is the quality of the decisions around the diff: what to build, what to accept, what to reject, what the agent got plausibly wrong.',
    sourceId: 'why-the-old-ladder',
    sourceName: 'Why the old ladder',
  },
  span: {
    limiting: 'Custody span is the limiting axis.',
    action: 'Run the signature test.',
    sentence: 'The level is the largest unit for which the honest answer is yes.',
    sourceId: 'the-three-tests',
    sourceName: 'The three tests',
  },
};

/**
 * Sends one enumerated event through the always-on GA4 tag.
 *
 * No article text and no reader-provided value is ever sent, and the
 * instrument's event carries no axis value: those are an assessment of a named
 * colleague and they stay in the reader's browser.
 *
 * @param {string} name
 * @param {Record<string, string>} detail
 */
function track(name, detail) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, { guide: GUIDE, ...detail });
}

/** Reports the outbound intents the design enumerates. */
function installEventReporting() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (link === null) return;

    const route = link.dataset.route;
    if (route !== undefined) {
      track('guide_route_started', { route });
      return;
    }
    const kind = link.dataset.event;
    if (kind === 'source') track('guide_source_opened', { target: link.dataset.target ?? '' });
    else if (kind === 'handoff') {
      track('guide_handoff_followed', { target: link.dataset.target ?? '' });
    }
  });
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

/**
 * Draws the custody line once, when the reader reaches the plate.
 *
 * The trigger is the viewport's central band rather than a visibility ratio: the
 * plate is taller than a phone viewport, so a ratio threshold could never be met
 * and the line would stay undrawn. A timer forces the finished state as a second
 * guarantee. Under reduced motion the observer is never installed.
 */
function installLineDraw() {
  const figure = document.getElementById('fig-lattice');
  if (figure === null) return;
  if (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    typeof IntersectionObserver !== 'function'
  ) {
    return;
  }

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
  window.setTimeout(finish, 5000);
}

/**
 * Collects the instrument, or `null` when the document does not have the shape
 * this enhancement expects: a partial DOM leaves the CSS instrument untouched
 * rather than half upgraded.
 *
 * @returns {object | null}
 */
function collectCheck() {
  const section = document.getElementById('custody-check');
  if (section === null) return null;

  const inputs = [...section.querySelectorAll('input[type="radio"][data-axis]')];
  const diagnosis = section.querySelector('[data-diagnosis]');
  const quote = section.querySelector('[data-quote]');
  const announce = section.querySelector('[data-announce]');
  const label = section.querySelector('.verdict .label');
  const axisNames = {};

  for (const key of AXIS_KEYS) {
    const name = section.querySelector(`#axis-${key}-h .check-axis-name`);
    if (name !== null) axisNames[key] = name.textContent.trim();
  }

  if (inputs.length !== 12 || diagnosis === null || quote === null || announce === null)
    return null;
  if (label === null || Object.keys(axisNames).length !== AXIS_KEYS.length) return null;

  return {
    section,
    inputs,
    diagnosis,
    quote,
    announce,
    prefix: label.textContent.trim(),
    axisNames,
  };
}

/**
 * Resolves the custody line: the lowest tier any axis is set to, and every axis
 * sitting on it.
 *
 * @param {object} model
 * @returns {{ floor: number, limiting: string[] }}
 */
function resolve(model) {
  const values = {};
  for (const input of model.inputs) {
    if (input.checked) values[input.dataset.axis] = Number(input.dataset.tier);
  }

  const floor = Math.min(...AXIS_KEYS.map((key) => values[key]));
  return { floor, limiting: AXIS_KEYS.filter((key) => values[key] === floor) };
}

/**
 * Names the limiting axes and picks the sentence that answers them.
 *
 * On a tie the line names both axes, because sending a reader to run half the
 * work would be worse than naming one axis too many; the sentence follows
 * {@link PRIORITY}.
 *
 * @param {object} model
 * @param {string[]} limiting
 * @returns {{ diagnosis: object, limitingText: string }}
 */
function describe(model, limiting) {
  if (limiting.length === AXIS_KEYS.length) {
    return { diagnosis: DIAGNOSES.agree, limitingText: DIAGNOSES.agree.limiting };
  }

  const primary = PRIORITY.find((key) => limiting.includes(key));
  const diagnosis = DIAGNOSES[primary];
  if (limiting.length === 1) return { diagnosis, limitingText: diagnosis.limiting };

  const names = AXIS_KEYS.filter((key) => limiting.includes(key)).map(
    (key) => model.axisNames[key]
  );
  return {
    diagnosis,
    limitingText: `${names[0]} and ${names[1].toLowerCase()} are the limiting axes.`,
  };
}

/**
 * Writes the keyed sentence and its return link.
 *
 * Built with DOM nodes rather than markup, so no string in this module can ever
 * be parsed as HTML.
 *
 * @param {Element} node
 * @param {object} diagnosis
 */
function writeQuote(node, diagnosis) {
  const text = document.createElement('p');
  text.className = 'quote-text';
  text.textContent = `“${diagnosis.sentence}”`;

  const link = document.createElement('a');
  link.className = 'mono quote-link';
  link.href = `#${diagnosis.sourceId}`;
  link.textContent = `${node.dataset.readIn} ${diagnosis.sourceName}`;

  node.replaceChildren(text, link);
}

/**
 * Renders the verdict for the current marks.
 *
 * @param {object} model
 */
function renderVerdict(model) {
  const { floor, limiting } = resolve(model);
  const { diagnosis, limitingText } = describe(model, limiting);
  const level = model.section.querySelector(`[data-level="${floor}"]`);

  model.diagnosis.textContent = `${limitingText} ${diagnosis.action}`;
  writeQuote(model.quote, diagnosis);

  // Restarting the entrance animation is what says "this is new content" rather
  // than "a sentence changed while you were not looking".
  for (const node of [model.diagnosis, model.quote]) {
    node.classList.remove('is-fresh');
    void node.offsetWidth;
    node.classList.add('is-fresh');
  }

  const levelText = level === null ? '' : level.textContent.trim().replace(' · ', ', ');
  model.announce.textContent = `${model.prefix}: ${levelText.toLowerCase()}. ${limitingText}`;
}

/**
 * Wires the instrument: one change listener, one reset listener, one event.
 *
 * @param {object} model
 */
function installCheck(model) {
  let started = false;

  model.section.addEventListener('change', () => {
    renderVerdict(model);
    if (started) return;
    started = true;
    track('guide_model_started', {});
  });

  // A form reset restores the defaults after its own event and fires no change
  // event of its own, so the verdict is re-read on the next task. A frame
  // callback is not enough: a document in a background or unpainted frame has
  // its animation callbacks throttled, and the verdict would keep the marks it
  // had before the reset.
  model.section.addEventListener('reset', () => {
    window.setTimeout(() => renderVerdict(model), 0);
  });

  renderVerdict(model);
}

function enhance() {
  installEventReporting();
  installRailSpy();
  installLineDraw();

  const model = collectCheck();
  if (model === null) return;
  installCheck(model);
}

try {
  enhance();
} catch (error) {
  console.error('[ihtech.ba] field guide enhancement disabled:', error);
}
