// /menu wow layer (Motion 14): scroll-linked parallax, staggered reveals, count-up, 3D tilt, magic-line pills, drawn heading rules.
// Pure enhancement: without JS or with reduced motion everything is already visible and static.
import { animate, scroll, inView, stagger } from 'motion';

const root = document.querySelector<HTMLElement>('.mv');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const $$ = <T extends HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

if (root && !reduce) {
  root.classList.add('wow');
  const spring = { type: 'spring', stiffness: 260, damping: 26 } as const;

  // hero: background drifts, giant outlined word moves against it, title letters rise, elephant pops, numbers count up
  const hero = document.querySelector<HTMLElement>('.dk-hero');
  if (hero) {
    const bg = hero.querySelector<HTMLElement>('.dk-bg'), ghost = hero.querySelector<HTMLElement>('.dk-ghost');
    if (bg) scroll(animate(bg, { transform: ['translateY(-7%) scale(1.14)', 'translateY(9%) scale(1.14)'] }, { ease: 'linear' }), { target: hero, offset: ['start end', 'end start'] });
    if (ghost) scroll(animate(ghost, { transform: ['translateX(6%)', 'translateX(-10%)'] }, { ease: 'linear' }), { target: hero, offset: ['start end', 'end start'] });
    const h = hero.querySelector<HTMLElement>('.dk-h');
    if (h && !h.dataset.split) {
      const t = h.textContent || ''; h.dataset.split = '1'; h.setAttribute('aria-label', t); h.textContent = '';
      t.split('').forEach((c) => { const sp = document.createElement('span'); sp.className = 'dk-ch'; sp.setAttribute('aria-hidden', 'true'); sp.textContent = c === ' ' ? '\u00a0' : c; sp.style.opacity = '0'; h.appendChild(sp); });
    }
    inView(hero, () => {
      const el = hero.querySelector('.dk-el'); if (el) animate(el, { opacity: [0, 1], scale: [0.5, 1], rotate: [-12, 0] }, spring);
      animate($$('.dk-ch', hero), { opacity: [0, 1], y: ['60%', '0%'], rotate: [4, 0] }, { delay: stagger(0.05, { startDelay: 0.15 }), duration: 0.6, ease: [0.23, 1, 0.32, 1] });
      animate($$('.dk-kicker,.dk-sub', hero), { opacity: [0, 1], y: [14, 0] }, { delay: stagger(0.12, { startDelay: 0.5 }), duration: 0.6, ease: [0.23, 1, 0.32, 1] });
      $$('.dk-sub .num', hero).forEach((n) => { const to = parseInt(n.textContent || '0', 10); animate(0, to, { duration: 1.2, ease: [0.23, 1, 0.32, 1], onUpdate: (v) => { n.textContent = String(Math.round(v)); } }); });
    }, { amount: 0.35 });
  }

  // photo rail: cards fly in one after another, then tilt toward the pointer
  const rail = document.querySelector<HTMLElement>('.dk-rail');
  if (rail) {
    const cards = $$('.dk-card', rail); cards.forEach((c) => { c.style.opacity = '0'; });
    inView(rail, () => { animate(cards, { opacity: [0, 1], x: [48, 0], scale: [0.94, 1] }, { delay: stagger(0.08), duration: 0.7, ease: [0.23, 1, 0.32, 1] }); }, { amount: 0.2 });
  }
  if (fine) $$('.dk-card').forEach((card) => {
    const inner = card.querySelector<HTMLElement>('.dk-in'); if (!inner) return;
    card.addEventListener('pointermove', (e) => { const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; inner.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`; inner.style.setProperty('--gx', `${(x + 0.5) * 100}%`); inner.style.setProperty('--gy', `${(y + 0.5) * 100}%`); });
    card.addEventListener('pointerleave', () => { animate(inner, { transform: 'perspective(700px) rotateY(0deg) rotateX(0deg)' }, spring); });
  });

  // category pills: one red blob glides to the pill you point at or focus
  const cats = document.querySelector<HTMLElement>('.dk-cats-rail'), blob = cats?.querySelector<HTMLElement>('.dk-blob');
  if (cats && blob) {
    let shown = false;
    const to = (b: HTMLElement) => { const x = b.offsetLeft, w = b.offsetWidth; if (!shown) { blob.style.transform = `translateX(${x}px)`; blob.style.width = w + 'px'; shown = true; animate(blob, { opacity: 1 }, { duration: 0.15 }); } else { animate(blob, { transform: `translateX(${x}px)`, width: w + 'px' }, spring); } };
    $$('.dk-cat', cats).forEach((b) => { b.addEventListener('pointerenter', () => to(b)); b.addEventListener('focus', () => to(b)); });
    cats.addEventListener('pointerleave', () => { shown = false; animate(blob, { opacity: 0 }, { duration: 0.15 }); });
  }

  // food + drinks groups: heading rule draws itself, big numeral slides in, strip photos drift inside their frames
  $$('.mv-grp').forEach((g) => inView(g, () => { g.classList.add('is-in'); }, { amount: 0.05, margin: '0px 0px -12% 0px' }));
  $$('.fg svg').forEach((ic) => inView(ic, () => { animate(ic, { y: [14, 0], scale: [0.7, 1], rotate: [-10, 0], opacity: [0, 1] }, spring); }, { amount: 0.6 }));
}
