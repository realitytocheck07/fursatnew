// Tiny shared state between the always-loaded mount.ts and the lazy dialog chunk. No three.js here.
import type { Light } from './Room';
export const bus = { sel: null as string | null, light: 'afternoon' as Light, subs: new Set<(l: Light) => void>() };
export const LIGHT_NAMES: Light[] = ['afternoon', 'sunset', 'night'];
