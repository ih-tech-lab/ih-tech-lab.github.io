/**
 * ihtech.ba interaction layer. No dependencies.
 *
 * Content is never hidden by script that might not run: reveal states live
 * behind the `.js` class on <html>, and the inline guard in <head> removes
 * that class if this module has not flagged itself ready within 3 seconds.
 */
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealAll() {
  for (const el of document.querySelectorAll('.reveal')) el.classList.add('is-in');
}

function reveals() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  for (const el of items) io.observe(el);
}

function header() {
  const el = document.querySelector('[data-header]');
  if (!el) return;
  const update = () => el.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function mobileNav() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;
  const header = toggle.closest('.site-header');

  const setOpen = (open) => {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}

try {
  header();
  mobileNav();
  reveals();
  window.__ihReady = true;
} catch (error) {
  root.classList.remove('js');
  revealAll();
  console.error('[ihtech.ba] interaction disabled:', error);
}
