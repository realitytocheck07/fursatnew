// Pick your spot: the one entry point. Always-loaded and tiny (no three.js, no react): the heavy chunk (react-dom, three, the room) loads only when the dialog opens.
//  • window.fkPickSpot.open(from?) — opens the full-screen <dialog>. The form's "Pick your spot" tab calls it.
//  • window.fkRoomLight(name)      — 'afternoon' | 'sunset' | 'night': sets the room light (works before and while the dialog is open).
import css from './shell.css?inline';
import { bus, LIGHT_NAMES } from './bus';
import type { Light } from './Room';

const STILL = { s: '/assets/booking3d/ps-iso-600.webp', l: '/assets/booking3d/ps-iso-1200.webp' };
const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

const addCss = () => { if (document.getElementById('ps-shell-css')) return; const s = document.createElement('style'); s.id = 'ps-shell-css'; s.textContent = css; document.head.append(s); };
const webglOK = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

// shared state: the last pick survives closing and reopening; the form's ✕ clears it
if (typeof window !== 'undefined') {
  window.addEventListener('fk:table', (e) => { bus.sel = (e as CustomEvent).detail?.id ?? null; });
  window.addEventListener('fk:table-clear', () => { bus.sel = null; });
  (window as any).fkRoomLight = (name: string) => { if (!LIGHT_NAMES.includes(name as Light)) return; bus.light = name as Light; bus.subs.forEach((f) => f(bus.light)); };
  (window as any).fkPickSpot = { open: (from?: Element | null) => openPickSpot(from) };
}

let dlg: HTMLDialogElement | null = null, root: { unmount(): void } | null = null, plan: { destroy(): void } | null = null, opener: Element | null = null, prevOv = ['', ''];
const lock = (on: boolean) => {
  const h = document.documentElement, b = document.body;
  if (on) { prevOv = [h.style.overflow, b.style.overflow]; h.style.overflow = 'hidden'; b.style.overflow = 'hidden'; } else { h.style.overflow = prevOv[0]; b.style.overflow = prevOv[1]; }
};
function cleanup() {
  if (!dlg) return; const d = dlg; dlg = null;
  try { root?.unmount(); } catch { /* already gone */ } root = null; plan?.destroy(); plan = null;
  d.remove(); lock(false);
  const o = opener as HTMLElement | null; opener = null; if (o && o.isConnected) o.focus({ preventScroll: true });
}

/** 2D floor plan inside the same dialog: used when WebGL is missing or the 3D room fails */
async function showPlan(d: HTMLDialogElement) {
  const host = d.querySelector('.ps-host') as HTMLElement; root?.unmount(); root = null;
  host.innerHTML = `<div class="ps-nogl"><h2>Pick your spot</h2><p>A table preference — we confirm on WhatsApp.</p><div id="ps-plan-host"></div></div><button type="button" class="ps-x0" aria-label="Close">${CLOSE}</button>`;
  host.querySelector('.ps-x0')!.addEventListener('click', () => d.close());
  const { mountPlan } = await import('./plan2d'); if (dlg !== d) return;
  plan = mountPlan(host.querySelector('#ps-plan-host') as HTMLElement);
}

export async function openPickSpot(from?: Element | null): Promise<void> {
  if (dlg) return; addCss(); opener = from ?? document.activeElement;
  const d = document.createElement('dialog'); d.className = 'ps-dlg'; d.setAttribute('aria-label', 'Pick your spot');
  d.innerHTML = '<div class="ps-host"></div>'; document.body.append(d); dlg = d; d.showModal(); lock(true); d.addEventListener('close', cleanup);
  if (!webglOK()) { void showPlan(d); return; }
  // first frame at once: the still of the room + the branded loader, until the live room has drawn
  const boot = document.createElement('div'); boot.className = 'ps-boot';
  boot.innerHTML = `<img class="ps-still" src="${STILL.l}" srcset="${STILL.s} 600w, ${STILL.l} 1200w" sizes="100vw" alt="" decoding="async"><div class="ps-load" role="status"><img src="/assets/brand/fursat-elephant.webp" alt="" width="42" height="54"><span>Setting the tables…</span></div>`;
  d.append(boot);
  const done = () => { boot.classList.add('is-gone'); setTimeout(() => boot.remove(), 600); };
  try {
    const [{ createElement }, { createRoot }, { default: PickSpot }] = await Promise.all([import('react'), import('react-dom/client'), import('./PickSpot')]);
    if (dlg !== d) return;
    const r = createRoot(d.querySelector('.ps-host') as HTMLElement); root = r;
    r.render(createElement(PickSpot, { onClose: () => d.close(), onReady: done, onFail: () => { boot.remove(); void showPlan(d); } }));
  } catch { boot.remove(); if (dlg === d) void showPlan(d); }
}
