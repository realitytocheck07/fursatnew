// 2D floor plan table picker: the same tables (tables.config.ts) drawn from above as an SVG. It needs no WebGL, so picking a table works on every device.
// A pick is broadcast exactly like the 3D room does: window event "fk:table" { id, zone, zoneName, seats, line } (or null). "fk:table-clear" clears it.
import { TABLES, ZONES, ROOM, tableLine, zoneName, type TableRow, type ZoneId } from './tables.config';

const NS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof SVGElementTagNameMap>(n: K, a: Record<string, string | number> = {}, kids: (SVGElement | string)[] = []) => {
  const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, String(a[k]));
  kids.forEach((c) => e.append(c)); return e;
};
// top-down footprint of each shape in metres, centred on (0,0); local +z = the front (where chairs face)
function body(t: TableRow): SVGElement[] {
  const out: SVGElement[] = [];
  const chair = (x: number, z: number) => out.push(el('circle', { cx: x, cy: z, r: .24, class: 'pl-chair' }));
  if (t.shape === 'round') { out.push(el('circle', { r: .62, class: 'pl-top' })); const n = t.seats; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; chair(Math.cos(a) * 1.0, Math.sin(a) * 1.0); } }
  else if (t.shape === 'rect') { const w = t.seats > 4 ? 2.3 : 1.7; out.push(el('rect', { x: -w / 2, y: -.5, width: w, height: 1, rx: .12, class: 'pl-top' })); const side = Math.ceil(t.seats / 2); for (let i = 0; i < side; i++) { const x = (i - (side - 1) / 2) * (w / side + .05); chair(x, -.86); chair(x, .86); } }
  else if (t.shape === 'long') { out.push(el('rect', { x: -2.4, y: -.5, width: 4.8, height: 1, rx: .12, class: 'pl-top' })); const per = t.seats / 2; for (let i = 0; i < per; i++) { const x = (i - (per - 1) / 2) * (4.5 / per); chair(x, -.86); chair(x, .86); } }
  else if (t.shape === 'booth') { out.push(el('rect', { x: -1.0, y: -.45, width: 2, height: .9, rx: .1, class: 'pl-top' }), el('rect', { x: -1.15, y: -1.0, width: 2.3, height: .45, rx: .2, class: 'pl-sofa' })); chair(-.5, .85); chair(.5, .85); }
  else { out.push(el('circle', { r: .5, class: 'pl-top' }), el('path', { d: 'M-1.45 .3 A1.5 1.5 0 0 1 1.45 .3 L1.1 .55 A1.15 1.15 0 0 0 -1.1 .55 Z', class: 'pl-sofa' })); }
  return out;
}

export function mountPlan(host: HTMLElement): { destroy(): void } {
  let sel: string | null = null, zone: ZoneId | 'all' = 'all';
  host.innerHTML = '';
  const w = ROOM.x1 - ROOM.x0, h = ROOM.z1 - ROOM.z0;
  const svg = el('svg', { viewBox: `${ROOM.x0} ${ROOM.z0} ${w} ${h}`, class: 'pl-svg', role: 'group', 'aria-label': 'Floor plan of Fursat, seen from above' });
  svg.append(el('rect', { x: ROOM.x0, y: ROOM.z0, width: w, height: h, rx: .4, class: 'pl-floor' }));
  // label spots chosen so a name never sits on a table
  const LAB: Record<string, [number, number]> = { bar: [-6, -5.0], high: [-0.4, -5.5], long: [-7.4, 3.3], booths: [6.2, -5.6], mural: [9.2, 2.3], dining: [-0.5, 4.9], lounge: [5.2, 2.2], cafe: [-6.6, 6.0] };
  ZONES.forEach((z) => { const [lx, lz] = LAB[z.id] ?? [z.x, z.z - 1.35]; const t = el('text', { x: lx, y: lz, class: 'pl-zone', 'text-anchor': 'middle' }); t.textContent = z.name; svg.append(t); });
  const groups = new Map<string, SVGGElement>();
  TABLES.forEach((t) => {
    const g = el('g', { class: 'pl-t', transform: `translate(${t.x} ${t.z}) rotate(${(t.rotation * 180) / Math.PI})`, tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': `${tableLine(t)}` }, body(t)) as SVGGElement;
    const lab = el('text', { class: 'pl-id', 'text-anchor': 'middle', y: .14, transform: `rotate(${(-t.rotation * 180) / Math.PI})` }); lab.textContent = t.id; g.append(lab);
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
    window.dispatchEvent(new CustomEvent('fk:table', { detail: t ? { id: t.id, zone: t.zone, zoneName: zoneName(t.zone), seats: t.seats, line: tableLine(t) } : null }));
  }
  const clear = () => { sel = null; paint(); };
  window.addEventListener('fk:table-clear', clear);
  paint();
  return { destroy() { window.removeEventListener('fk:table-clear', clear); host.innerHTML = ''; } };
}
