// Pick your spot: the table data. One row per table, nothing else is hand-placed (chairs, pins, plan and the form line are all generated from it).
// Layout = the v2 room, T1–T20 (owner decision for now).
// TODO(client): confirm the real floor plan (30 tables), the real seat counts, and the zone names (they follow the form's seating choices: Bar, Dining, Lounge, Café).
// x → right, z → towards the viewer, metres. shape/rotation feed the 2D plan; s/kind/r/w/d/chair/top feed the 3D room.
export type Shape = 'round' | 'rect' | 'long' | 'booth' | 'sofa';
export type ZoneId = 'bar' | 'dining' | 'lounge' | 'cafe';
export type Chair = 'green' | 'blue' | 'wood' | 'stool' | 'none';
export interface TableRow {
  id: string; zone: ZoneId; seats: number; x: number; z: number; rotation: number; shape: Shape;
  s: 'round' | 'rect'; kind: 'round' | 'rect' | 'booth' | 'lounge'; r: number; w: number; d: number; chair: Chair; top: 'cream' | 'wood';
}
export interface Zone { id: ZoneId; name: string; x: number; z: number; r: number; }

export const ZONES: Zone[] = [
  { id: 'bar', name: 'Bar', x: -5.7, z: -4.2, r: 5 },
  { id: 'dining', name: 'Dining', x: 2, z: -1.4, r: 8.6 },
  { id: 'lounge', name: 'Lounge', x: 8.8, z: -0.4, r: 3.8 },
  { id: 'cafe', name: 'Café', x: -1.8, z: 4.4, r: 8 },
];

const R = (n: number, zone: ZoneId, x: number, z: number, r: number, seats: number, chair: Chair = 'green', kind: TableRow['kind'] = 'round'): TableRow =>
  ({ id: 'T' + n, zone, seats, x, z, rotation: 0, shape: kind === 'lounge' ? 'sofa' : 'round', s: 'round', kind, r, w: r * 2, d: r * 2, chair, top: 'cream' });
const T = (n: number, zone: ZoneId, x: number, z: number, w: number, d: number, seats: number, chair: Chair = 'green', kind: TableRow['kind'] = 'rect', top: TableRow['top'] = 'cream'): TableRow =>
  ({ id: 'T' + n, zone, seats, x, z, rotation: 0, shape: kind === 'booth' ? 'booth' : 'rect', s: 'rect', kind, r: 0, w, d, chair, top });

export const TABLES: TableRow[] = [
  R(1, 'bar', -6.6, -4.5, 0.38, 2, 'stool'), R(2, 'bar', -4.9, -4.5, 0.38, 2, 'stool'),
  T(3, 'dining', -3.6, -0.6, 0.95, 5.4, 12, 'green', 'rect', 'wood'),   // the long table
  T(4, 'dining', 3.6, -4.4, 1.3, 0.8, 4, 'none', 'booth'), T(5, 'dining', 6.2, -4.4, 1.3, 0.8, 4, 'none', 'booth'), T(6, 'dining', 8.8, -4.4, 1.3, 0.8, 4, 'none', 'booth'),
  T(7, 'dining', 1.2, -1.5, 1.5, 0.95, 4), T(8, 'dining', 3.8, -1.4, 1.5, 0.95, 4), T(9, 'dining', 6, 0.2, 1.5, 0.95, 4),
  T(10, 'dining', 1.8, 0.6, 2, 0.95, 6), T(11, 'dining', 4.5, 1.9, 1.5, 0.95, 4), T(12, 'dining', 2.4, 3, 1.5, 0.95, 4), T(13, 'dining', -0.7, -1.6, 1.5, 0.95, 4),
  R(14, 'lounge', 8.8, -0.2, 0.5, 4, 'none', 'lounge'),
  T(15, 'cafe', -2.6, 3.7, 1.5, 0.95, 4, 'blue'), T(16, 'cafe', -0.4, 3.7, 1.5, 0.95, 4, 'blue'),
  T(17, 'cafe', -9.2, 4.9, 1.3, 0.8, 4, 'none', 'booth'), T(18, 'cafe', -7, 4.9, 1.3, 0.8, 4, 'none', 'booth'), T(19, 'cafe', -4.8, 4.9, 1.3, 0.8, 4, 'none', 'booth'),
  R(20, 'cafe', 5.4, 4.7, 0.7, 4, 'wood'),
];

export const FLOOR: [number, number][] = [[-10.5, -6], [10.5, -6], [10.5, 7.2], [3.6, 7.2], [3.6, 4.6], [-0.5, 4.6], [-0.5, 6.4], [-10.5, 6.4]];
export const ROOM = { x0: -10.5, x1: 10.5, z0: -6, z1: 7.2 };
export const zoneName = (id: ZoneId) => ZONES.find((z) => z.id === id)?.name ?? id;
export const tableLine = (t: TableRow) => `${t.id} · ${t.seats} seats · ${zoneName(t.zone)}`;
export const detailOf = (t: TableRow) => ({ id: t.id, zone: t.zone, zoneName: zoneName(t.zone), seats: t.seats, line: tableLine(t) });
