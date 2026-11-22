// Canvas textures for the room (seeded, cached) and the two brand images. Ported from the v2 room.
import * as THREE from 'three';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number, r: () => number) => void;
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cache: Record<string, THREE.Texture> = {};
const mk = (key: string, w: number, h: number, draw: Draw, o: { repeat?: [number, number]; wrap?: boolean; aniso?: number } = {}) => {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, w, h, rng(key.length * 977));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = o.aniso ?? 4;
  if (o.wrap !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping; if (o.repeat) t.repeat.set(...o.repeat);
  return (cache[key] = t);
};

export const marble = () => mk('marble', 1024, 1024, (g, w, h, r) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#dfb87e'); gr.addColorStop(0.5, '#d2a96f'); gr.addColorStop(1, '#dcb680'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '150,105,60' : '255,240,210'},${0.04 + r() * 0.09})`; g.lineWidth = 0.6 + r() * 2.4; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.3) * 160; y += (r() - 0.5) * 120; g.quadraticCurveTo(x - 40, y + 30, x, y); } g.stroke(); }
  g.strokeStyle = 'rgba(120,85,45,.22)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.lineWidth = 1.4; g.stroke();
}, { repeat: [0.25, 0.25], aniso: 8 });

export const mosaic = (rx: number, rz: number) => mk('mosaic', 256, 256, (g, w, h) => {
  g.fillStyle = '#f6ecd6'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b9923d'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w - 6, h / 2); g.lineTo(w / 2, h - 6); g.lineTo(6, h / 2); g.closePath(); g.stroke();
  g.fillStyle = '#2f5a3c'; for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]]) { g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill(); }
  g.fillStyle = '#c9a24b'; for (const [x, y] of [[w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
}, { repeat: [rx, rz] });

export const carpet = () => mk('carpet', 512, 512, (g, w, h, r) => {
  g.fillStyle = '#6e2a22'; g.fillRect(0, 0, w, h);
  ([[0, '#c9a24b'], [14, '#2b4a3a'], [34, '#8a3a2a'], [60, '#d8b96a']] as [number, string][]).forEach(([i, c]) => { g.strokeStyle = c; g.lineWidth = i === 14 ? 20 : 4; g.strokeRect(i + 6, i + 6, w - 2 * i - 12, h - 2 * i - 12); });
  g.fillStyle = '#2b4a3a'; g.beginPath(); g.ellipse(w / 2, h / 2, 150, 100, 0, 0, 7); g.fill(); g.strokeStyle = '#d8b96a'; g.lineWidth = 5; g.stroke();
  g.fillStyle = '#a24a30'; g.beginPath(); g.ellipse(w / 2, h / 2, 70, 44, 0, 0, 7); g.fill();
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,220,160,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 2, 2); }
}, { wrap: false });

export const wood = (base = '#b27a43', dk = '90,55,20') => mk('wood' + base, 512, 512, (g, w, h, r) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * 0.08})` : `rgba(255,225,170,${r() * 0.1})`; g.fillRect(i * 128, 0, 128, h); }
  for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${dk},${0.05 + r() * 0.12})`; g.lineWidth = 0.5 + r() * 2; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, 150, x - 8, 350, x + 4, h); g.stroke(); }
  g.fillStyle = 'rgba(40,22,8,.5)'; for (let i = 0; i < 4; i++) g.fillRect(i * 128, 0, 2.5, h);
});

export const channel = () => mk('channel', 256, 256, (g, _w, h) => {
  for (let i = 0; i < 8; i++) { const x = i * 32, gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#6e1620'); gr.addColorStop(0.5, '#b02a36'); gr.addColorStop(1, '#6e1620'); g.fillStyle = gr; g.fillRect(x, 0, 32, h); }
}, { repeat: [2, 1] });

export const hexShelf = () => mk('hex', 512, 400, (g, w, h, r) => {
  const bg = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.6); bg.addColorStop(0, '#5a3a14'); bg.addColorStop(1, '#1a0f06'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const s = 52, cols = ['#7a2a2a', '#c58a2a', '#2f5a3c', '#d9c28a'];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
    const x = 40 + col * s * 1.74 + (row % 2) * s * 0.87, y = 36 + row * s * 1.5;
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; g.lineTo(x + s * 0.95 * Math.cos(a), y + s * 0.95 * Math.sin(a)); } g.closePath(); g.fillStyle = 'rgba(255,190,90,.16)'; g.fill(); g.strokeStyle = '#e0a93f'; g.lineWidth = 3.5; g.stroke();
    g.fillStyle = cols[(r() * 4) | 0]; g.fillRect(x - 6, y - 18, 12, 38); g.fillRect(x - 2.5, y - 30, 5, 14);
  }
}, { wrap: false });

export const slats = () => mk('slats', 256, 256, (g, w, h) => {
  g.fillStyle = '#1f4a2e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#265a38' : '#1a3f27'; g.fillRect(i * 16, 0, 12, h); g.fillStyle = 'rgba(217,181,92,.55)'; g.fillRect(i * 16 + 12, 0, 2, h); }
}, { repeat: [3, 1] });

export const mural = (seed: number) => mk('mural' + seed, 512, 640, (g, w, h, r) => {
  g.fillStyle = '#f0e2bf'; g.fillRect(0, 0, w, h);
  const leaf = (x: number, y: number, len: number, a: number, c: string) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.35, -len * 0.3, len * 0.8, -len * 0.22, len, 0); g.bezierCurveTo(len * 0.8, len * 0.22, len * 0.35, len * 0.3, 0, 0); g.fill(); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.95, 0); g.stroke(); g.restore(); };
  const gc = ['#2f6a3f', '#3f8250', '#245232', '#5a9a5c'];
  for (let i = 0; i < 38; i++) leaf(r() * w, h * (0.35 + r() * 0.65), 120 + r() * 170, -Math.PI / 2 + (r() - 0.5) * 2.4, gc[(r() * 4) | 0]);
  g.fillStyle = '#e6784a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(60 + r() * 380, 120 + r() * 300, 9 + r() * 8, 0, 7); g.fill(); }
  g.strokeStyle = '#d65a62'; g.lineWidth = 7; g.lineCap = 'round'; const fx = 150 + seed * 90; g.beginPath(); g.moveTo(fx, 460); g.quadraticCurveTo(fx - 30, 330, fx + 10, 230); g.quadraticCurveTo(fx + 40, 190, fx + 70, 205); g.stroke();
  g.fillStyle = '#f0a0a0'; g.beginPath(); g.ellipse(fx - 8, 400, 34, 20, -0.5, 0, 7); g.fill();
}, { wrap: false });

const img = (key: string, url: string, invalidate: () => void) => cache['i' + key] ||= (() => { const t = new THREE.TextureLoader().load(url, invalidate); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
export const logo = (inv: () => void) => img('logo', '/assets/booking3d/ps-logo.webp', inv);
export const elephant = (inv: () => void) => img('elephant', '/assets/booking3d/ps-elephant.webp', inv);

/** soft glow used by the Night pendants */
export const glow = () => mk('glow', 128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,214,150,.95)'); r.addColorStop(0.35, 'rgba(255,190,100,.35)'); r.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, { wrap: false });
export const ring = () => mk('ring', 256, 256, (g, w, h) => { g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 9; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 8, 0, 7); g.stroke(); }, { wrap: false });
export const disposeTextures = () => { for (const k in cache) { cache[k].dispose(); delete cache[k]; } };
