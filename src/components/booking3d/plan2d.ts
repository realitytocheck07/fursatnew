// 2D floor plan table picker: the same tables (tables.config.ts) drawn from above as an SVG. It needs no WebGL, so picking a table works on every device.
// A pick is broadcast exactly like the 3D room does: window event "fk:table" { id, zone, zoneName, seats, line } (or null). "fk:table-clear" clears it.
import { TABLES, ZONES, ROOM, FLOOR, tableLine, detailOf, type TableRow, type ZoneId } from './tables.config';

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof SVGElementTagNameMap>(n: K, a: Record<string, string | number> = {}, kids: (SVGElement | string)[] = []) => {
  const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, String(a[k]));
  kids.forEach((c) => e.append(c)); return e;
};
// top-down footprint of each table in metres, centred on (0,0), drawn from the same fields the 3D room uses (w, d, r, kind, chair)
function body(t: TableRow): SVGElement[] {
  const out: SVGElement[] = [];
  const chair = (x: number, z: number) => out.push(el('circle', { cx: x, cy: z, r: .24, class: 'pl-chair' }));
  if (t.kind === 'lounge') { out.push(el('circle', { r: t.r, class: 'pl-top' }), el('path', { d: 'M-1.45 .3 A1.5 1.5 0 0 1 1.45 .3 L1.1 .55 A1.15 1.15 0 0 0 -1.1 .55 Z', class: 'pl-sofa' })); return out; }
  if (t.s === 'round') { out.push(el('circle', { r: t.r, class: 'pl-top' })); if (t.chair !== 'none') for (let i = 0; i < t.seats; i++) { const a = (i / t.seats) * Math.PI * 2 + Math.PI / 4; chair(Math.cos(a) * (t.r + .4), Math.sin(a) * (t.r + .4)); } return out; }
  out.push(el('rect', { x: -t.w / 2, y: -t.d / 2, width: t.w, height: t.d, rx: .1, class: 'pl-top' }));
  if (t.kind === 'booth') { for (const sg of [-1, 1]) out.push(el('rect', { x: -(t.w + .55) / 2, y: sg * (t.d / 2 + .42) - .26, width: t.w + .55, height: .52, rx: .18, class: 'pl-sofa' })); return out; }
  const alongX = t.w >= t.d, n = Math.ceil(t.seats / 2), len = alongX ? t.w : t.d;
  for (const sd of [-1, 1]) for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * (len / n), off = (alongX ? t.d : t.w) / 2 + .4; if (alongX) chair(o, sd * off); else chair(sd * off, o); }
  return out;
}

export function mountPlan(host: HTMLElement): { destroy(): void } {
  let sel: string | null = null, zone: ZoneId | 'all' = 'all';
  host.innerHTML = '';
  const w = ROOM.x1 - ROOM.x0, h = ROOM.z1 - ROOM.z0;
  const svg = el('svg', { viewBox: `${ROOM.x0} ${ROOM.z0} ${w} ${h}`, class: 'pl-svg', role: 'group', 'aria-label': 'Floor plan of Fursat, seen from above' });
  svg.append(el('polygon', { points: FLOOR.map(([x, z]) => `${x},${z}`).join(' '), class: 'pl-floor' }));
  // label spots chosen so a name never sits on a table
  const LAB: Record<string, [number, number]> = { bar: [-5.7, -5.3], dining: [-0.2, 5.8], lounge: [8.8, 1.6], cafe: [-5, 6.9] };
  ZONES.forEach((z) => { const [lx, lz] = LAB[z.id] ?? [z.x, z.z - 1.35]; const t = el('text', { x: lx, y: lz, class: 'pl-zone', 'text-anchor': 'middle' }); t.textContent = z.name; svg.append(t); });
  const groups = new Map<string, SVGGElement>();
  TABLES.forEach((t) => {
    const g = el('g', { class: 'pl-t', transform: `translate(${t.x} ${t.z})`, tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': `${tableLine(t)}` }, body(t)) as SVGGElement;
    const lab = el('text', { class: 'pl-id', 'text-anchor': 'middle', y: .14 }); lab.textContent = t.id; g.append(lab);
    const toggle = () => pick(sel === t.id ? null : t.id);
    g.addEventListener('click', toggle); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    groups.set(t.id, g); svg.append(g);
  });
  const note = document.createElement('p'); note.className = 'pl-note'; note.setAttribute('aria-live', 'polite');
  const zones = document.createElement('div'); zones.className = 'fk-rail pl-zones'; zones.setAttribute('role', 'group'); zones.setAttribute('aria-label', 'Zones');
  const zb: [string, string, HTMLButtonElement][] = [['all', 'All', document.createElement('button')], ...ZONES.map((z) => [z.id, z.name, document.createElement('button')] as [string, string, HTMLButtonElement])];
  zb.forEach(([id, name, b]) => { b.type = 'button'; b.className = 'fk-pill'; b.textContent = name; b.addEventListener('click', () => { zone = id as ZoneId | 'all'; paint(); }); zones.append(b); });
  host.append(zones, svg, note);

  function paint() {
    TABLES.forEach((t) => { const g = groups.get(t.id)!; g.classList.toggle('is-sel', sel === t.id); g.classList.toggle('is-dim', zone !== 'all' && t.zone !== zone); g.setAttribute('aria-pressed', String(sel === t.id)); });
    zb.forEach(([id, , b]) => b.setAttribute('aria-pressed', String(zone === id)));
    const t = TABLES.find((x) => x.id === sel);
    note.textContent = t ? `${tableLine(t)}. We’ll confirm it with you on WhatsApp.` : 'Tap a table you’d like. We’ll confirm it with you on WhatsApp.';
  }
  function pick(id: string | null) {
    sel = id; const t = TABLES.find((x) => x.id === id); paint();
    window.dispatchEvent(new CustomEvent('fk:table', { detail: t ? detailOf(t) : null }));
  }
  const clear = () => { sel = null; paint(); };
  window.addEventListener('fk:table-clear', clear);
  paint();
  return { destroy() { window.removeEventListener('fk:table-clear', clear); host.innerHTML = ''; } };
}
