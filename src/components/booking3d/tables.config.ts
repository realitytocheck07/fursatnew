// All tables live here. To add one, add a row: nothing else changes (chairs, chips, picking and the form line are generated).
// x → right, z → towards the viewer, metres. rotation = radians around Y (0 = chairs/banquette face +z, banquette on the -z side).
// shape: 'round' | 'rect' | 'long' | 'booth' (table + banquette on its back side) | 'sofa' (round low table + sofa arc)
export type Shape = 'round' | 'rect' | 'long' | 'booth' | 'sofa';
export type ZoneId = 'bar' | 'high' | 'long' | 'booths' | 'mural' | 'dining' | 'lounge' | 'cafe';
export interface TableRow { id: string; zone: ZoneId; seats: number; x: number; z: number; rotation: number; shape: Shape; }
export interface Zone { id: ZoneId; name: string; x: number; z: number; }

// plain zone names only (no courtyard: Fursat has none)
export const ZONES: Zone[] = [
  { id: 'bar', name: 'Bar', x: -6, z: -3.7 },
  { id: 'high', name: 'High tables', x: -0.4, z: -4.2 },
  { id: 'long', name: 'Long table', x: -7.4, z: 0.2 },
  { id: 'booths', name: 'Booths', x: 6.2, z: -4.2 },
  { id: 'mural', name: 'Mural booths', x: 8.6, z: -0.6 },
  { id: 'dining', name: 'Dining', x: -0.4, z: 1.2 },
  { id: 'lounge', name: 'Lounge', x: 6, z: 3.6 },
  { id: 'cafe', name: 'Café corner', x: -6.6, z: 4.5 },
];

const P = Math.PI;
export const TABLES: TableRow[] = [
  { id: 'T1', zone: 'bar', seats: 2, x: -7.0, z: -3.7, rotation: 0, shape: 'round' },
  { id: 'T2', zone: 'bar', seats: 2, x: -5.0, z: -3.7, rotation: 0, shape: 'round' },
  { id: 'T3', zone: 'high', seats: 4, x: -1.6, z: -4.2, rotation: 0, shape: 'rect' },
  { id: 'T4', zone: 'high', seats: 4, x: 0.8, z: -4.2, rotation: 0, shape: 'rect' },
  { id: 'T5', zone: 'long', seats: 12, x: -7.4, z: 0.2, rotation: P / 2, shape: 'long' },
  { id: 'T6', zone: 'booths', seats: 4, x: 3.6, z: -4.4, rotation: 0, shape: 'booth' },
  { id: 'T7', zone: 'booths', seats: 4, x: 6.2, z: -4.4, rotation: 0, shape: 'booth' },
  { id: 'T8', zone: 'booths', seats: 4, x: 8.8, z: -4.4, rotation: 0, shape: 'booth' },
  { id: 'T9', zone: 'mural', seats: 4, x: 8.7, z: -1.6, rotation: -P / 2, shape: 'booth' },
  { id: 'T10', zone: 'mural', seats: 4, x: 8.7, z: 0.5, rotation: -P / 2, shape: 'booth' },
  { id: 'T11', zone: 'dining', seats: 4, x: -3.2, z: -0.6, rotation: 0, shape: 'rect' },
  { id: 'T12', zone: 'dining', seats: 4, x: -0.6, z: -0.6, rotation: 0, shape: 'rect' },
  { id: 'T13', zone: 'dining', seats: 6, x: 2.2, z: 0.2, rotation: 0, shape: 'rect' },
  { id: 'T14', zone: 'dining', seats: 4, x: -2.2, z: 2.8, rotation: 0, shape: 'rect' },
  { id: 'T15', zone: 'dining', seats: 4, x: 0.6, z: 2.8, rotation: 0, shape: 'rect' },
  { id: 'T16', zone: 'lounge', seats: 4, x: 7.4, z: 3.6, rotation: 0, shape: 'sofa' },
  { id: 'T17', zone: 'lounge', seats: 4, x: 4.4, z: 3.9, rotation: 0, shape: 'sofa' },
  { id: 'T18', zone: 'cafe', seats: 2, x: -8.6, z: 4.4, rotation: 0, shape: 'round' },
  { id: 'T19', zone: 'cafe', seats: 2, x: -6.6, z: 4.6, rotation: 0, shape: 'round' },
  { id: 'T20', zone: 'cafe', seats: 4, x: -4.4, z: 4.5, rotation: 0, shape: 'rect' },
];

export const ROOM = { x0: -10.5, x1: 10.5, z0: -6, z1: 6.4 };
export const zoneName = (id: ZoneId) => ZONES.find((z) => z.id === id)?.name ?? id;
export const tableLine = (t: TableRow) => `${t.id} · ${zoneName(t.zone)} · ${t.seats} seats`;
