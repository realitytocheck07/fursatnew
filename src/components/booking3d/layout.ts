// Turns a config row into drawable geometry: table size, chair spots, banquette. Pure maths, no three.js.
import type { TableRow } from './tables.config';
export interface Chair { x: number; z: number; a: number; }   // local to the table; a = yaw so the chair faces the table
export interface Layout { w: number; d: number; h: number; round: boolean; chairs: Chair[]; banquette: boolean; stool: boolean; }

const ring = (n: number, r: number, from = 0, span = Math.PI * 2): Chair[] =>
  Array.from({ length: n }, (_, i) => { const t = from + (span * (i + 0.5)) / n; return { x: Math.sin(t) * r, z: Math.cos(t) * r, a: t + Math.PI }; });
const row = (n: number, len: number, z: number, a: number): Chair[] =>
  Array.from({ length: n }, (_, i) => ({ x: n === 1 ? 0 : -len / 2 + (len * (i + 0.5)) / n, z, a }));

export function layoutOf(t: TableRow): Layout {
  const s = t.seats;
  switch (t.shape) {
    case 'round': {
      const hi = t.zone === 'bar';
      return { w: 0.8, d: 0.8, h: hi ? 1.05 : 0.74, round: true, banquette: false, stool: hi, chairs: ring(s, 0.62) };
    }
    case 'long': {
      const per = Math.ceil((s - 2) / 2), L = Math.max(3.6, per * 0.58 + 0.4), at = (i: number) => -L / 2 + 0.3 + ((L - 0.6) * i) / Math.max(1, per - 1);
      return { w: 0.95, d: L, h: 0.76, round: false, banquette: false, stool: false, chairs: [
        ...Array.from({ length: per }, (_, i) => ({ x: 0.78, z: at(i), a: -Math.PI / 2 })),
        ...Array.from({ length: per }, (_, i) => ({ x: -0.78, z: at(i), a: Math.PI / 2 })),
        { x: 0, z: L / 2 + 0.55, a: Math.PI }, { x: 0, z: -L / 2 - 0.55, a: 0 }] };
    }
    case 'booth': return { w: 1.3, d: 0.8, h: 0.74, round: false, banquette: true, stool: false, chairs: [{ x: -0.35, z: 0.72, a: Math.PI }, { x: 0.35, z: 0.72, a: Math.PI }] };
    case 'sofa': return { w: 0.9, d: 0.9, h: 0.42, round: true, banquette: false, stool: false, chairs: ring(Math.min(s, 4), 0.95, Math.PI * 0.55, Math.PI * 0.9) };
    default: {
      const wide = s > 4, w = wide ? 2 : 1.5, d = 0.95, per = Math.ceil(s / 2);
      const long = row(per, w - 0.2, d / 2 + 0.34, Math.PI), far = row(s - per, w - 0.2, -d / 2 - 0.34, 0);
      return { w, d, h: t.zone === 'high' ? 1.05 : 0.74, round: false, banquette: false, stool: t.zone === 'high', chairs: [...long, ...far] };
    }
  }
}
