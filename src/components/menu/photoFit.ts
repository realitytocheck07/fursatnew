// Places a portrait dish photo inside a card frame so the dish is always visible, whatever the frame shape.
// focus = where the dish is in the photo (cx, cy as 0-1) and a zoom; target = where in the frame the dish should land
// (a little above centre, because the wavy cut trims the bottom-left). Pure math, returns an inline style for an absolutely placed <img>.
import focusData from '../../data/photo-focus.json';
type Focus = { cx: number; cy: number; z: number };
const FOCUS = focusData as Record<string, Focus>;
const DEFAULT: Focus = { cx: 0.5, cy: 0.62, z: 1.1 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** @param name dish name (key of dish-photos.json) @param ar photo width/height @param a frame width/height */
export function fitStyle(name: string, ar: number, a: number, tx = 0.5, ty = 0.46): string {
  const f = FOCUS[name] ?? DEFAULT;
  const imgW = Math.max(f.z, ar / a);          // never smaller than the frame (cover), in frame-width units
  const imgH = imgW / ar;                       // frame-width units
  const frameH = 1 / a;
  const left = clamp(tx - f.cx * imgW, 1 - imgW, 0);
  const top = clamp(ty * frameH - f.cy * imgH, frameH - imgH, 0);
  const p = (n: number) => +(n * 100).toFixed(2);
  return `left:${p(left)}%;top:${p(top * a)}%;width:${p(imgW)}%;height:${p(imgH * a)}%`;
}
