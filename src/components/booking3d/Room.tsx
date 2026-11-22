// The 3D room (R3F v9 + three addons only: no drei, no gsap). v2 room ported: one cut-away iso scene, 20 tables, chairs/plants/plates instanced,
// static furniture merged into 4 batches, shadows baked once (re-baked when the light changes), on-demand rendering.
// Camera moves are a small rAF tween inside useFrame (no React state per frame). Table pins are plain DOM nodes positioned from here (no 3D text).
import { Component, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TABLES, ZONES, FLOOR, type TableRow, type ZoneId } from './tables.config';
import * as TX from './textures';

export type View = 'orbit' | 'plan' | 'pov';
export type Light = 'afternoon' | 'sunset' | 'night';
export interface RoomApi { zoom(f: number): void; }
export interface RoomProps {
  selectedId: string | null; party: number; view: View; light: Light; zone: ZoneId | null; camKey: number; flyIn: boolean;
  onSelect(id: string): void; onReady(): void; onFail(): void; pins: { current: Map<string, HTMLElement> }; apiRef: { current: RoomApi | null };
}

const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const COL = { free: '#56662a', sel: '#c99a43', dim: '#6f6552' };
const DEF_AZ = -0.3;
const BAR_DIR = new THREE.Vector3(-0.25, 0, -1).normalize();   // POV looks toward the bar (back wall)

/* ---------- geometry kit (vertex-coloured, merged → one draw call per chair style) ---------- */
const part = (g: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0) => { g.translate(x, y, z); const c = new THREE.Color(color), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w: number, h: number, d: number, c: string, x = 0, y = 0, z = 0) => part(new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cyl = (r: number, h: number, c: string, x = 0, y = 0, z = 0, rt = r, seg = 20) => part(new THREE.CylinderGeometry(rt, r, h, seg), c, x, y, z);
const merge = (a: THREE.BufferGeometry[]) => mergeGeometries(a, false)!;
const legs = (sx: number, sz: number, h: number, c: string, t = 0.04) => [-1, 1].flatMap((a) => [-1, 1].map((b) => box(t, h, t, c, a * sx, h / 2, b * sz)));
const DARK = '#241a12', BRASS = '#c99a43';

const chairGeo: Record<string, () => THREE.BufferGeometry> = {
  green: () => merge([box(0.46, 0.08, 0.46, '#2e5a3b', 0, 0.46, 0), box(0.46, 0.42, 0.07, '#2e5a3b', 0, 0.74, -0.21), ...legs(0.18, 0.18, 0.44, DARK)]),
  blue: () => merge([box(0.58, 0.14, 0.54, '#2a5c88', 0, 0.4, 0), box(0.58, 0.5, 0.1, '#2a5c88', 0, 0.72, -0.26), box(0.08, 0.26, 0.5, '#2a5c88', -0.3, 0.55, 0), box(0.08, 0.26, 0.5, '#2a5c88', 0.3, 0.55, 0), ...legs(0.24, 0.22, 0.2, BRASS, 0.05)]),
  wood: () => { const arc = (y: number, r = 0.21) => part(new THREE.TorusGeometry(r, 0.016, 6, 18, Math.PI).rotateX(-Math.PI / 2), '#b98446', 0, y, 0); return merge([cyl(0.22, 0.05, '#c08a4d', 0, 0.46, 0, 0.22, 18), arc(0.66), arc(0.78), box(0.03, 0.34, 0.03, '#9a6a34', -0.2, 0.62, -0.06), box(0.03, 0.34, 0.03, '#9a6a34', 0.2, 0.62, -0.06), ...legs(0.16, 0.16, 0.44, '#8a5a2a', 0.03)]); },
  stool: () => merge([cyl(0.21, 0.07, '#3f7a4b', 0, 0.74, 0), cyl(0.03, 0.7, BRASS, 0, 0.37, 0), cyl(0.22, 0.03, BRASS, 0, 0.02, 0), part(new THREE.TorusGeometry(0.17, 0.012, 6, 20).rotateX(Math.PI / 2), BRASS, 0, 0.3, 0)]),
  arm: () => merge([box(0.7, 0.16, 0.64, '#b8703a', 0, 0.4, 0), box(0.7, 0.55, 0.14, '#b8703a', 0, 0.72, -0.3), box(0.1, 0.3, 0.6, '#b8703a', -0.4, 0.55, 0), box(0.1, 0.3, 0.6, '#b8703a', 0.4, 0.55, 0), ...legs(0.3, 0.26, 0.2, DARK, 0.05)]),
};
const plantGeo = () => { const p = [cyl(0.2, 0.3, '#b66a3a', 0, 0.15, 0, 0.26), cyl(0.2, 0.02, '#2a1c10', 0, 0.3, 0)]; const gc = ['#2f6a3f', '#3f8250', '#245232', '#4f9a58']; for (let k = 0; k < 10; k++) { const g = new THREE.ConeGeometry(0.09, 1, 5); g.translate(0, 0.5, 0); g.rotateZ(0.35 + (k % 3) * 0.22); g.rotateY(k * 2.4); p.push(part(g, gc[k % 4], 0, 0.3, 0)); } return merge(p); };

/* ---------- static instance lists derived from the table rows ---------- */
type Item = number[];
const seatsOf = (t: TableRow) => {
  const a: number[][] = [], gap = t.chair === 'stool' ? 0.34 : 0.4;
  if (t.s === 'round') for (let i = 0; i < t.seats; i++) { const g = (i * Math.PI * 2) / t.seats + Math.PI / 4; a.push([t.x + Math.cos(g) * (t.r + gap), t.z + Math.sin(g) * (t.r + gap), t.x, t.z]); }
  else { const alongX = t.w >= t.d, n = Math.ceil(t.seats / 2); for (const sd of [-1, 1]) for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * ((alongX ? t.w : t.d) / n); a.push(alongX ? [t.x + o, t.z + sd * (t.d / 2 + gap), t.x + o, t.z] : [t.x + sd * (t.w / 2 + gap), t.z + o, t.x, t.z + o]); } }
  return a;
};
const LISTS = (() => {
  const L: Record<string, Item[]> = { green: [], blue: [], wood: [], stool: [], arm: [], plate: [], lamp: [] };
  for (const t of TABLES) {
    if (t.chair !== 'none') for (const [x, z, tx, tz] of seatsOf(t)) {
      L[t.chair].push([x, 0, z, Math.atan2(tx - x, tz - z)]);
      const h = Math.hypot(tx - x, tz - z) || 1; L.plate.push([x + ((tx - x) * 0.55) / h, 0.78, z + ((tz - z) * 0.55) / h]);
    }
    if (t.kind === 'booth') for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.plate.push([t.x + sx * 0.38, 0.78, t.z + sz * (t.d / 2 - 0.14)]);
    if (t.w > 3 || t.d > 3) for (const o of [-1.6, 0, 1.6]) L.lamp.push([t.x, 0.78, t.z + o]); else L.lamp.push([t.x, 0.78, t.z]);
  }
  for (let i = 0; i < 6; i++) L.stool.push([-1.6 + i * 0.64, 0, -3.6, Math.PI]);
  L.arm.push([7.5, 0, -0.7, Math.PI / 2], [9.9, 0, 1.1, Math.atan2(-1.1, -1.3)]);
  return L;
})();
const PLANTS: Item[] = ([[-10, -5.4, 1.2], [-10, -3.2, 1], [-9.9, 0.2, 1], [-7.4, -5.5, 1.1], [-2.7, -5.5, 1.2], [2.5, -5.6, 1.1], [10, -5.5, 1.2], [10, -3, 1.4], [10, 2.2, 1.3], [10.1, 4.2, 1.1], [-10, 2.2, 1], [-10, 5.8, 1], [-6, 6, 0.9], [-1.2, 5.8, 0.9], [-0.9, 4.1, 0.8], [3.2, 4.3, 0.9], [4.2, 6.9, 0.9], [10, 6.8, 1], [7.4, 3.1, 0.9], [-2, -2.9, 0.8]] as number[][]).map(([x, z, s]) => [x, 0, z, x * 3, s]);
const WALLS = [[-10.5, -6, 10.5, -6, 3.4], [-10.5, -6, -10.5, 0.5, 3.4], [-10.5, 0.5, -10.5, 6.4, 0.9], [10.5, -6, 10.5, 1.8, 3.4], [10.5, 1.8, 10.5, 7.2, 0.9], [-10.5, 6.4, -0.5, 6.4, 0.9], [-0.5, 6.4, -0.5, 4.6, 0.9], [-0.5, 4.6, 3.6, 4.6, 0.9], [3.6, 4.6, 3.6, 7.2, 0.9], [3.6, 7.2, 10.5, 7.2, 0.9]];

/* ---------- static batches: walls, table bodies, booths, bar, sofa → 4 merged meshes ---------- */
const CREAM = '#efe3c8', RED = '#9a2230', SOFA = '#2f5a3c', BDARK = '#3a2a1c';
const bxr = (w: number, h: number, d: number, c: string, x: number, y: number, z: number, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); return part(g, c, x, y, z); };
const buildStatic = () => {
  const vc: THREE.BufferGeometry[] = [], channel: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [], lamp: THREE.BufferGeometry[] = [];
  for (const [x1, z1, x2, z2, h] of WALLS) {
    const L = Math.hypot(x2 - x1, z2 - z1), ang = -Math.atan2(z2 - z1, x2 - x1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, add = (w: number, hh: number, d: number, c: string, y: number) => vc.push(bxr(w, hh, d, c, cx, y, cz, ang));
    if (h > 1) { add(L, h, 0.3, '#eadcb8', h / 2); add(L + 0.06, 0.12, 0.38, '#1b3a29', h); add(L, 0.2, 0.34, '#1b3a29', 0.1); add(L, 0.03, 0.32, BRASS, 0.24); } else { add(L, h, 0.3, '#1b3a29', h / 2); add(L, 0.03, 0.32, BRASS, h + 0.015); }
  }
  for (const t of TABLES) {
    if (t.s === 'round') {
      vc.push(part(new THREE.CylinderGeometry(t.r, t.r, 0.06, 40), CREAM, t.x, 0.75, t.z), cyl(0.06, 0.7, BDARK, t.x, 0.36, t.z, 0.06, 12), cyl(Math.min(0.38, t.r * 0.9), 0.05, t.chair === 'stool' ? BRASS : BDARK, t.x, 0.03, t.z, Math.min(0.34, t.r * 0.8), 28));
    } else if (t.kind === 'booth') {
      const w = t.w + 0.55; vc.push(bxr(t.w, 0.06, t.d, CREAM, t.x, 0.75, t.z), bxr(0.14, 0.72, 0.14, BDARK, t.x, 0.36, t.z), bxr(t.w - 0.3, 0.05, 0.5, BDARK, t.x, 0.03, t.z));
      for (const sg of [-1, 1]) { vc.push(bxr(w, 0.46, 0.52, RED, t.x, 0.24, t.z + sg * (t.d / 2 + 0.42))); channel.push(bxr(w, 1.05, 0.16, '#fff', t.x, 0.78, t.z + sg * (t.d / 2 + 0.74)), bxr(0.14, 1.05, 1.6, '#fff', t.x + sg * (w / 2 + 0.04), 0.78, t.z)); }
    } else {
      (t.top === 'wood' ? wood : vc).push(bxr(t.w, 0.06, t.d, CREAM, t.x, 0.75, t.z));
      for (const x of [-1, 1]) for (const z of [-1, 1]) vc.push(bxr(0.07, 0.72, 0.07, BDARK, t.x + x * (t.w / 2 - 0.08), 0.36, t.z + z * (t.d / 2 - 0.08)));
    }
  }
  vc.push(bxr(4.8, 0.9, 0.5, BDARK, 0, 0.45, -5.7), bxr(4.5, 0.06, 1, CREAM, 0, 1.08, -4.6), bxr(0.55, 0.45, 2.4, RED, -10, 0.23, 3), bxr(0.76, 0.05, 0.5, CREAM, -0.9, 1.06, 5.9),
    bxr(2.4, 0.42, 0.95, SOFA, 9.1, 0.3, -2.2), bxr(2.4, 0.6, 0.24, SOFA, 9.1, 0.78, -2.56), bxr(0.24, 0.6, 0.95, SOFA, 8.02, 0.62, -2.2), bxr(0.24, 0.6, 0.95, SOFA, 10.18, 0.62, -2.2));
  wood.push(bxr(4.4, 1.05, 0.9, '#fff', 0, 0.52, -4.6), bxr(0.7, 1.05, 0.45, '#fff', -0.9, 0.52, 5.9));
  channel.push(bxr(0.14, 0.9, 2.4, '#fff', -10.26, 0.6, 3));
  lamp.push(bxr(4.2, 0.72, 0.03, '#e0a040', 0, 0.55, -4.14));
  for (const x of [-9.3, -7.6, -2.5, 2.3, 5, 7.5, 10]) lamp.push(bxr(0.1, 0.32, 0.08, '#ffd98a', x, 2.75, -5.77));
  for (const [x, z] of [[7.3, -2.4], [10.1, 2]]) { vc.push(bxr(0.03, 1.5, 0.03, BRASS, x, 0.75, z)); lamp.push(part(new THREE.CylinderGeometry(0.17, 0.22, 0.3, 14), '#ffd98a', x, 1.55, z)); }
  return { vc: merge(vc), channel: merge(channel), wood: merge(wood), lamp: merge(lamp) };
};

/* ---------- shared assets (built once; disposed when the room unmounts) ---------- */
interface Assets {
  vc: THREE.Material; arch(w: number, h: number): THREE.BufferGeometry; st: ReturnType<typeof buildStatic>; circle: THREE.BufferGeometry; floorGeo: THREE.BufferGeometry; slabGeo: THREE.BufferGeometry;
  geo: Record<string, THREE.BufferGeometry>; mk: Record<string, THREE.Material>; m: Record<string, THREE.Material>;
  pm: { shade: THREE.MeshBasicMaterial; bulb: THREE.MeshBasicMaterial; cord: THREE.MeshBasicMaterial; glow: THREE.PointsMaterial }; pg: { shade: THREE.BufferGeometry; bulb: THREE.BufferGeometry; cord: THREE.BufferGeometry };
}
let A: Assets | null = null;
const disposeAssets = () => {
  if (!A) return; const a = A; A = null;
  Object.values(a.geo).forEach((g) => g.dispose()); Object.values(a.st).forEach((g) => g.dispose()); [a.floorGeo, a.slabGeo, a.circle, ...Object.values(a.pg)].forEach((g) => g.dispose());
  [a.vc, ...Object.values(a.m), ...Object.values(a.mk), ...Object.values(a.pm)].forEach((m) => m.dispose()); TX.disposeTextures();
};
const assets = (): Assets => A ||= (() => {
  // phones get Lambert (cheap) shading, desktops get PBR
  const S = (o: Record<string, any>, r = 0.8) => { const { metalness, roughness, ...rest } = o; return coarse ? new THREE.MeshLambertMaterial(rest) : new THREE.MeshStandardMaterial({ roughness: roughness ?? r, ...(metalness !== undefined && { metalness }), ...rest }); };
  const vc = coarse ? new THREE.MeshLambertMaterial({ vertexColors: true }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 });
  const arch = (w: number, h: number) => { const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2 - w / 2); s.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false); s.closePath(); const g = new THREE.ShapeGeometry(s, 24), p = g.attributes.position, u = g.attributes.uv; for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; };
  const shape = new THREE.Shape(FLOOR.map(([x, z]) => new THREE.Vector2(x, -z)));
  const MK = (color: string, opacity: number) => new THREE.MeshBasicMaterial({ map: TX.ring(), color, opacity, transparent: true, depthWrite: false, toneMapped: false });
  const lampGeo = merge([cyl(0.04, 0.1, '#f3ead2', 0, 0.05, 0), part(new THREE.SphereGeometry(0.035, 10, 8), '#ffd98a', 0, 0.14, 0)]);
  const P = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  return {
    vc, arch, st: buildStatic(), circle: new THREE.CircleGeometry(1, 64),
    floorGeo: new THREE.ShapeGeometry(shape), slabGeo: new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false }),
    geo: { ...Object.fromEntries(Object.entries(chairGeo).map(([k, f]) => [k, f()])), plant: plantGeo(), plate: new THREE.CylinderGeometry(0.12, 0.12, 0.012, 20), lamp: lampGeo },
    mk: { free: MK(COL.free, 0.9), hov: MK('#7d9338', 1), sel: MK(COL.sel, 1), dim: MK(COL.dim, 0.5) },
    m: { green: S({ color: '#1b3a29' }), brass: S({ color: BRASS, metalness: 0.6, roughness: 0.35 }), plate: S({ color: '#fbf6ea' }, 0.3), slab: S({ color: '#d8c49a' }, 1), channel: S({ map: TX.channel() }, 0.85), wood: S({ map: TX.wood() }, 0.6),
      lamp: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), hlSel: new THREE.MeshBasicMaterial({ color: COL.sel, transparent: true, opacity: 0.32, depthWrite: false }), hlHov: new THREE.MeshBasicMaterial({ color: '#e6d9a8', transparent: true, opacity: 0.28, depthWrite: false }) },
    // Night / Sunset pendants: brass shade, warm bulb, soft glow. Invisible (opacity 0) in the afternoon.
    pm: { shade: Object.assign(P('#d6a84e'), { side: THREE.DoubleSide }), bulb: P('#ffe2a8'), cord: P('#2a1c10'), glow: new THREE.PointsMaterial({ map: TX.glow(), size: 3.0, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }) },
    pg: { shade: new THREE.ConeGeometry(0.2, 0.2, 18, 1, true), bulb: new THREE.SphereGeometry(0.06, 10, 8), cord: new THREE.CylinderGeometry(0.006, 0.006, 1, 4) },
  };
})();

const Mat = ({ roughness, metalness, ...p }: Record<string, any>) => coarse ? <meshLambertMaterial {...p} /> : <meshStandardMaterial {...(roughness !== undefined && { roughness })} {...(metalness !== undefined && { metalness })} {...p} />;

function Inst({ geo, mat, items, shadow = true }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: Item[]; shadow?: boolean }) {
  const r = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => { const o = new THREE.Object3D(); items.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); o.rotation.set(0, it[3] || 0, 0); o.scale.setScalar(it[4] || 1); o.updateMatrix(); r.current!.setMatrixAt(i, o.matrix); }); r.current!.instanceMatrix.needsUpdate = true; }, [items]);
  return <instancedMesh ref={r} args={[geo, mat, items.length]} castShadow={shadow} receiveShadow={shadow} frustumCulled={false} raycast={() => null} dispose={null} />;
}
const Pl = ({ a, p, m, r = [0, 0, 0] }: { a: [number, number]; p: [number, number, number]; m: THREE.Material; r?: [number, number, number] }) => <mesh position={p} rotation={r} material={m} dispose={null}><planeGeometry args={a} /></mesh>;

/* ---------- shell ---------- */
const NOHIT = { raycast: () => null, dispose: null } as const;
const Statics = memo(function Statics({ a }: { a: Assets }) {
  const P = { castShadow: true, receiveShadow: true, ...NOHIT };
  return <>
    <mesh geometry={a.st.vc} material={a.vc} {...P} /><mesh geometry={a.st.channel} material={a.m.channel} {...P} />
    <mesh geometry={a.st.wood} material={a.m.wood} {...P} /><mesh geometry={a.st.lamp} material={a.m.lamp} {...NOHIT} />
  </>;
});
const Floor = memo(function Floor({ a }: { a: Assets }) {
  const mos = TX.mosaic(2, 4.3), R: [number, number, number] = [-Math.PI / 2, 0, 0];
  return <>
    <mesh geometry={a.floorGeo} rotation={R} receiveShadow {...NOHIT}><Mat map={TX.marble()} roughness={0.55} metalness={0.05} /></mesh>
    <mesh geometry={a.slabGeo} rotation={R} position={[0, -0.4, 0]} material={a.m.slab} {...NOHIT} />
    <Pl a={[2.7, 5.5]} p={[-9.05, 0.012, -3.15]} m={a.m.green} r={R} />
    <mesh rotation={R} position={[-9.05, 0.016, -3.15]} receiveShadow {...NOHIT}><planeGeometry args={[2.4, 5.2]} /><Mat map={mos} roughness={0.5} /></mesh>
    <Pl a={[3.9, 7]} p={[-3.6, 0.012, -0.6]} m={a.m.brass} r={R} />
    <mesh rotation={R} position={[-3.6, 0.016, -0.6]} receiveShadow {...NOHIT}><planeGeometry args={[3.7, 6.8]} /><Mat color="#2f5a3c" roughness={0.95} /></mesh>
    <mesh rotation={R} position={[8.75, 0.02, -0.55]} receiveShadow {...NOHIT}><planeGeometry args={[3.1, 4.3]} /><Mat map={TX.carpet()} roughness={0.95} /></mesh>
  </>;
});
const Decor = memo(function Decor({ a, inv }: { a: Assets; inv: () => void }) {
  const NZ = -5.84, ar = a.arch(2.2, 2.9), ar2 = a.arch(2.4, 3.1);
  return <>
    {[3.6, 6.2, 8.8].map((x, i) => <group key={x} position={[x, 2, NZ]}>
      <mesh geometry={ar2} position={[0, 0, -0.004]} material={a.m.green} /><mesh geometry={ar}><Mat map={TX.mural(i)} roughness={0.9} /></mesh>
    </group>)}
    <group position={[-9.3, 1.9, NZ]}><mesh geometry={a.arch(2.5, 3)} position={[0, 0, -0.004]} material={a.m.brass} /><mesh geometry={a.arch(2.3, 2.8)}><Mat map={TX.elephant(inv)} roughness={0.9} emissive="#3a2a10" emissiveIntensity={0.25} /></mesh></group>
    <mesh position={[-5.1, 1.7, NZ]}><planeGeometry args={[5, 3.2]} /><Mat map={TX.slats()} roughness={0.8} /></mesh>
    <mesh position={[0, 1.9, NZ]}><planeGeometry args={[4.8, 2.5]} /><Mat color="#222" emissive="#ffffff" emissiveMap={TX.hexShelf()} emissiveIntensity={0.9} /></mesh>
    <group position={[10.33, 1.75, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh><planeGeometry args={[5, 3.3]} /><Mat map={TX.channel()} roughness={0.9} emissive="#3a0a10" emissiveIntensity={0.5} /></mesh>
      <mesh position={[0, 0.05, 0.01]}><planeGeometry args={[1.55, 1.79]} /><meshBasicMaterial map={TX.logo(inv)} toneMapped={false} transparent /></mesh>
    </group>
  </>;
});

/* ---------- tables: one marker mesh each (bodies live in the static batches) ---------- */
type St = 'free' | 'sel' | 'small';
const backOut = (t: number) => { const c = 2.2, x = t - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
function Marker({ t, s, hov, a }: { t: TableRow; s: St; hov: boolean; a: Assets }) {
  const ring = useRef<THREE.Mesh>(null), inv = useThree((x) => x.invalidate), anim = useRef(0);
  const ex = t.s === 'round' ? t.r + (t.kind === 'lounge' ? 1.5 : 1.05) : t.kind === 'booth' ? 1.45 : t.w / 2 + 1, ez = t.s === 'round' ? ex : t.kind === 'booth' ? 1.75 : t.d / 2 + 1;
  useEffect(() => { if (s === 'sel') { anim.current = performance.now(); inv(); } }, [s]); // eslint-disable-line
  useFrame(() => { if (!anim.current || !ring.current) return; const k = Math.min(1, (performance.now() - anim.current) / 520), e = 0.8 + 0.2 * backOut(k); ring.current.scale.set(ex * e, ez * e, 1); if (k >= 1) anim.current = 0; else inv(); });
  const key = s === 'sel' ? 'sel' : s === 'free' ? (hov ? 'hov' : 'free') : 'dim';
  return <mesh ref={ring} geometry={a.circle} material={a.mk[key]} rotation={[-Math.PI / 2, 0, 0]} position={[t.x, 0.03, t.z]} scale={[ex, ez, 1]} dispose={null} />;
}
function Table({ t, s, hov, pick, setHov, a }: { t: TableRow; s: St; hov: boolean; pick(id: string): void; setHov(id: string | null): void; a: Assets }) {
  const round = t.s === 'round';
  return (
    <group onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); pick(t.id); }} onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHov(t.id); }} onPointerOut={() => setHov(null)}>
      <Marker t={t} s={s} hov={hov} a={a} />
      {(s === 'sel' || hov) && <mesh position={[t.x, 0.79, t.z]} material={s === 'sel' ? a.m.hlSel : a.m.hlHov} dispose={null} raycast={() => null}><boxGeometry args={round ? [t.r * 1.9, 0.008, t.r * 1.9] : [t.w + 0.02, 0.008, t.d + 0.02]} /></mesh>}
    </group>
  );
}

/* ---------- light presets: colour + intensity, tweened. Night = warm pendants + darker ambient ---------- */
interface LP { bg: string; sky: string; ground: string; hemi: number; sun: string; sunI: number; sunPos: [number, number, number]; pt: number; pend: number; }
export const LIGHTS: Record<Light, LP> = {
  afternoon: { bg: '#efe3c8', sky: '#ffe9c4', ground: '#8a6030', hemi: 0.8, sun: '#ffd9a0', sunI: 2.0, sunPos: [-8, 15, 10], pt: 20, pend: 0 },
  sunset: { bg: '#e6c39a', sky: '#ffc48a', ground: '#6a3a20', hemi: 0.52, sun: '#ff9650', sunI: 1.6, sunPos: [-15, 6.5, 7], pt: 36, pend: 0.55 },
  night: { bg: '#241a12', sky: '#ffcf99', ground: '#3a2412', hemi: 0.2, sun: '#ffc890', sunI: 0.3, sunPos: [-8, 15, 10], pt: 70, pend: 1 },
};
const PTS: number[][] = coarse ? [[-1, 2.6, -2.6, 1], [7, 2.6, 1, 1.1]] : [[-1, 2.6, -3, 1], [8, 2.6, 0, 1], [3, 2.6, 4.8, 1]];
interface LS { sky: THREE.Color; ground: THREE.Color; sunC: THREE.Color; bg: THREE.Color; hemi: number; sunI: number; pt: number; pend: number; }

function Lights({ light, a }: { light: Light; a: Assets }) {
  const { scene, gl, invalidate } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null), sun = useRef<THREE.DirectionalLight>(null), pts = useRef<(THREE.PointLight | null)[]>([]), pend = useRef<THREE.Group>(null);
  const cur = useRef<LS>({ sky: new THREE.Color(), ground: new THREE.Color(), sunC: new THREE.Color(), bg: new THREE.Color(), hemi: 0, sunI: 0, pt: 0, pend: 0 });
  const tw = useRef<{ from: LS; to: LP; at: number } | null>(null), first = useRef(true), tmp = useMemo(() => new THREE.Color(), []);
  const apply = () => {
    const c = cur.current; hemi.current!.color.copy(c.sky); hemi.current!.groundColor.copy(c.ground); hemi.current!.intensity = c.hemi; sun.current!.color.copy(c.sunC); sun.current!.intensity = c.sunI;
    pts.current.forEach((p, i) => { if (p) p.intensity = c.pt * PTS[i][3]; }); (scene.background as THREE.Color).copy(c.bg);
    const o = c.pend; a.pm.shade.opacity = o; a.pm.bulb.opacity = o; a.pm.cord.opacity = o * 0.8; a.pm.glow.opacity = o * 0.6; if (pend.current) pend.current.visible = o > 0.01;
  };
  useEffect(() => {
    const L = LIGHTS[light], c = cur.current;
    if (first.current) { first.current = false; c.sky.set(L.sky); c.ground.set(L.ground); c.sunC.set(L.sun); c.bg.set(L.bg); c.hemi = L.hemi; c.sunI = L.sunI; c.pt = L.pt; c.pend = L.pend; sun.current!.position.set(...L.sunPos); apply(); gl.shadowMap.needsUpdate = true; invalidate(); return; }
    tw.current = { from: { sky: c.sky.clone(), ground: c.ground.clone(), sunC: c.sunC.clone(), bg: c.bg.clone(), hemi: c.hemi, sunI: c.sunI, pt: c.pt, pend: c.pend }, to: L, at: performance.now() };
    sun.current!.position.set(...L.sunPos); gl.shadowMap.needsUpdate = true;   // shadows are baked once per preset, never per frame
    invalidate();
  }, [light]); // eslint-disable-line
  useFrame(() => {
    const T = tw.current; if (!T) return; const k = Math.min(1, (performance.now() - T.at) / 650), e = 1 - Math.pow(1 - k, 3), c = cur.current, f = T.from, L = T.to, mix = (x: number, y: number) => x + (y - x) * e;
    c.sky.copy(f.sky).lerp(tmp.set(L.sky), e); c.ground.copy(f.ground).lerp(tmp.set(L.ground), e); c.sunC.copy(f.sunC).lerp(tmp.set(L.sun), e); c.bg.copy(f.bg).lerp(tmp.set(L.bg), e);
    c.hemi = mix(f.hemi, L.hemi); c.sunI = mix(f.sunI, L.sunI); c.pt = mix(f.pt, L.pt); c.pend = mix(f.pend, L.pend); apply();
    if (k >= 1) tw.current = null; else invalidate();
  });
  const sm = coarse ? 1024 : 2048;
  return <>
    <color attach="background" args={[LIGHTS[light].bg]} />
    <hemisphereLight ref={hemi} />
    <directionalLight ref={sun} castShadow shadow-mapSize={[sm, sm]} shadow-bias={-0.0005} shadow-normalBias={0.03} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={13} shadow-camera-bottom={-13} shadow-camera-near={1} shadow-camera-far={42} />
    {PTS.map(([x, y, z], i) => <pointLight key={i} ref={(p) => { pts.current[i] = p; }} position={[x, y, z]} color="#ffb866" distance={10} decay={1.6} />)}
    <group ref={pend} visible={false}><Pendants a={a} /></group>
  </>;
}

function Pendants({ a }: { a: Assets }) {
  const sh = useRef<THREE.InstancedMesh>(null), bu = useRef<THREE.InstancedMesh>(null), co = useRef<THREE.InstancedMesh>(null);
  const pos = useMemo(() => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(TABLES.flatMap((t) => [t.x, 1.15, t.z]), 3)), []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D(); TABLES.forEach((t, i) => {
      o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.position.set(t.x, 2.42, t.z); o.updateMatrix(); sh.current!.setMatrixAt(i, o.matrix);
      o.position.set(t.x, 2.34, t.z); o.updateMatrix(); bu.current!.setMatrixAt(i, o.matrix);
      o.position.set(t.x, 2.95, t.z); o.scale.set(1, 0.9, 1); o.updateMatrix(); co.current!.setMatrixAt(i, o.matrix);
    }); [sh, bu, co].forEach((r) => { r.current!.instanceMatrix.needsUpdate = true; });
    return () => pos.dispose();
  }, [pos]);
  const n = TABLES.length;
  return <>
    <instancedMesh ref={sh} args={[a.pg.shade, a.pm.shade, n]} frustumCulled={false} raycast={() => null} dispose={null} />
    <instancedMesh ref={bu} args={[a.pg.bulb, a.pm.bulb, n]} frustumCulled={false} raycast={() => null} dispose={null} />
    <instancedMesh ref={co} args={[a.pg.cord, a.pm.cord, n]} frustumCulled={false} raycast={() => null} dispose={null} />
    <points geometry={pos} material={a.pm.glow} frustumCulled={false} raycast={() => null} dispose={null} />
  </>;
}

/* ---------- camera rig: views, fly-in, zone flights, POV, framing, pin layout ---------- */
const TARGET = new THREE.Vector3(0.2, 0.2, 0.3);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // in-out: this is on-screen movement
interface Pose { p: THREE.Vector3; t: THREE.Vector3; fov: number; }
interface Rect { l: number; t: number; r: number; b: number; }

// points that must stay on screen when the whole room is framed: floor corners, slab underside, tops of the tall walls
const FIT_PTS: THREE.Vector3[] = (() => {
  const a: THREE.Vector3[] = [];
  for (const [x, z] of FLOOR) a.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, -0.4, z));
  for (const [x1, z1, x2, z2, h] of WALLS) if (h > 1) a.push(new THREE.Vector3(x1, h, z1), new THREE.Vector3(x2, h, z2));
  return a;
})();
const zonePts = (z: { x: number; z: number; r: number }) => { const a: THREE.Vector3[] = []; for (let i = 0; i < 12; i++) { const g = (i / 12) * Math.PI * 2; for (const y of [0, 1.4]) a.push(new THREE.Vector3(z.x + Math.cos(g) * z.r, y, z.z + Math.sin(g) * z.r)); } return a; };

/** Frame a set of points inside a screen rectangle: the smallest distance that fits, then slide the target so the points sit centred in the rectangle. */
const fcam = new THREE.PerspectiveCamera(38, 1, 0.1, 400), fv = new THREE.Vector3();
function frame(pts: THREE.Vector3[], tgt0: THREE.Vector3, az: number, el: number, fov: number, w: number, h: number, rc: Rect, dMin: number, dMax: number) {
  const tgt = tgt0.clone(), rw = rc.r - rc.l, rh = rc.b - rc.t; let d = dMax;
  fcam.fov = fov; fcam.aspect = w / h; fcam.updateProjectionMatrix();
  const place = (dd: number) => { fcam.position.set(tgt.x + dd * Math.cos(el) * Math.sin(az), tgt.y + dd * Math.sin(el), tgt.z + dd * Math.cos(el) * Math.cos(az)); fcam.lookAt(tgt); fcam.updateMatrixWorld(true); };
  const box = () => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of pts) { fv.copy(q).project(fcam); const sx = (fv.x * 0.5 + 0.5) * w, sy = (-fv.y * 0.5 + 0.5) * h; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); } return { x0, x1, y0, y1 }; };
  const fwd = new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az)), right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));   // ground-plane forward / right of the camera
  for (let it = 0; it < 5; it++) {
    let lo = dMin, hi = dMax;
    for (let k = 0; k < 20; k++) { const mid = (lo + hi) / 2; place(mid); const b = box(); if (b.x1 - b.x0 <= rw && b.y1 - b.y0 <= rh) hi = mid; else lo = mid; }
    d = hi; place(d); const b = box();
    const dx = (rc.l + rc.r) / 2 - (b.x0 + b.x1) / 2, dy = (rc.t + rc.b) / 2 - (b.y0 + b.y1) / 2, perPx = (2 * d * Math.tan(THREE.MathUtils.degToRad(fov) / 2)) / h;
    tgt.addScaledVector(right, -dx * perPx).addScaledVector(fwd, (dy * perPx) / Math.max(Math.sin(el), 0.35));
  }
  place(d); return { tgt, d, box: box() };
}

const GAP = 3;
interface PinItem { id: string; el: HTMLElement; x: number; y: number; w: number; h: number; z: number; on: boolean; }
/** Push overlapping pins apart in screen space (axis of least overlap). Pins are never allowed to overlap: zooming in only separates them further. */
function relax(items: PinItem[]) {
  for (let it = 0; it < 12; it++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) { const a = items[i]; if (!a.on) continue;
      for (let j = i + 1; j < items.length; j++) { const b = items[j]; if (!b.on) continue;
        const dx = b.x - a.x, dy = b.y - a.y, ox = (a.w + b.w) / 2 + GAP - Math.abs(dx), oy = (a.h + b.h) / 2 + GAP - Math.abs(dy);
        if (ox > 0 && oy > 0) { moved = true; if (ox < oy) { const s = ((dx >= 0 ? 1 : -1) * ox) / 2; a.x -= s; b.x += s; } else { const s = ((dy >= 0 ? 1 : -1) * oy) / 2; a.y -= s; b.y += s; } }
      } }
    if (!moved) break;
  }
}

function Rig({ p }: { p: RoomProps }) {
  const { camera, gl, size, invalidate } = useThree();
  const ctl = useRef<OrbitControls | null>(null), tw = useRef<{ a: Pose; b: Pose; at: number; dur: number; mode: View } | null>(null), mode = useRef<View>('orbit');
  const maxD = useRef(30), measured = useRef(false), zoomOn = useRef(false), items = useRef<PinItem[]>([]);
  const portrait = size.width / size.height < 1, az0 = portrait ? -Math.PI / 2 : DEF_AZ;
  const root = () => gl.domElement.closest('.ps-root') as HTMLElement | null;
  /** the part of the screen that is free of chrome: under the title + zone chips, above the control bar */
  const rect = (): Rect => {
    const r = root(), rb = r?.getBoundingClientRect(), top = r?.querySelector('.ps-top')?.getBoundingClientRect(), bar = r?.querySelector('.ps-bar')?.getBoundingClientRect();
    const side = size.width < 700 ? 6 : 14;
    return { l: side, r: size.width - side, t: top && rb ? Math.max(0, top.bottom - rb.top) + 4 : 60, b: bar && rb ? Math.min(size.height, bar.top - rb.top) - 6 : size.height - 90 };
  };
  const pose = (view: View, selId: string | null, zone: ZoneId | null): Pose => {
    const t = TABLES.find((x) => x.id === selId) ?? null, z = ZONES.find((x) => x.id === zone) ?? null;
    if (view === 'pov' && t) {   // eye level at the chosen table, looking toward the bar
      const eye = new THREE.Vector3(t.x, 1.22, t.z).addScaledVector(BAR_DIR, -0.5);
      return { p: eye, t: eye.clone().addScaledVector(BAR_DIR, 0.06), fov: 64 };
    }
    const el = view === 'plan' ? 1.48 : portrait ? 1.1 : 0.95, c = ctl.current;
    const az = view === 'plan' ? (portrait ? az0 : 0) : z && c ? clamp(c.getAzimuthalAngle(), az0 - 1, az0 + 1) : az0;
    const f = frame(z ? zonePts(z) : FIT_PTS, z ? new THREE.Vector3(z.x, 0.3, z.z) : TARGET, az, el, 38, size.width, size.height, rect(), z ? 7 : 6, 120);
    if (!z) maxD.current = view === 'orbit' ? Math.max(f.d, 6) : Math.max(maxD.current, f.d);
    return { p: new THREE.Vector3(f.tgt.x + f.d * Math.cos(el) * Math.sin(az), f.d * Math.sin(el), f.tgt.z + f.d * Math.cos(el) * Math.cos(az)), t: f.tgt, fov: 38 };
  };
  const limits = (m: View) => {
    const c = ctl.current!; c.enablePan = false;
    if (m === 'pov') { c.minDistance = 0.02; c.maxDistance = 0.5; c.minPolarAngle = 0.35; c.maxPolarAngle = Math.PI - 0.35; c.minAzimuthAngle = -Infinity; c.maxAzimuthAngle = Infinity; c.enableZoom = false; c.rotateSpeed = -0.35; }
    else { c.minDistance = 5; c.maxDistance = maxD.current * 1.12; c.minPolarAngle = 0.08; c.maxPolarAngle = 1.5; c.minAzimuthAngle = portrait ? az0 - 0.9 : -1.05; c.maxAzimuthAngle = portrait ? az0 + 0.9 : 1.05; c.enableZoom = true; c.rotateSpeed = 0.6; }
  };
  const open = () => { const c = ctl.current!; c.minDistance = 0.02; c.maxDistance = 90; c.minPolarAngle = 0.08; c.maxPolarAngle = Math.PI - 0.35; c.minAzimuthAngle = -Infinity; c.maxAzimuthAngle = Infinity; };
  const go = (b: Pose, dur: number, m: View, from?: Pose) => {
    const c = ctl.current!, a = from ?? { p: camera.position.clone(), t: c.target.clone(), fov: (camera as THREE.PerspectiveCamera).fov };
    open(); tw.current = { a, b, at: performance.now(), dur, mode: m }; mode.current = m; invalidate();
  };
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); ctl.current = c; c.enableDamping = true; c.dampingFactor = 0.08; c.target.copy(TARGET);
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    c.addEventListener('change', () => invalidate()); c.addEventListener('start', () => { tw.current = null; });
    gl.domElement.style.touchAction = 'none';
    pose('plan', null, null);   // sets the zoom-out limit from the larger of the two framings
    const g = pose('orbit', null, null);
    if (p.flyIn) { const R = g.p.distanceTo(g.t) * 1.2, s: Pose = { p: new THREE.Vector3(g.t.x + R * Math.cos(0.55) * Math.sin(az0 - 0.8), R * Math.sin(0.55), g.t.z + R * Math.cos(0.55) * Math.cos(az0 - 0.8)), t: g.t.clone(), fov: 38 }; camera.position.copy(s.p); c.update(); go(g, 1100, 'orbit', s); }
    else { camera.position.copy(g.p); c.target.copy(g.t); c.update(); limits('orbit'); }
    p.apiRef.current = { zoom: (f) => { const v = camera.position.clone().sub(c.target), d = clamp(v.length() * f, mode.current === 'pov' ? 0.02 : 5, maxD.current * 1.12); v.setLength(d).add(c.target); camera.position.copy(v); c.update(); invalidate(); } };
    return () => { c.dispose(); p.apiRef.current = null; };
  }, []); // eslint-disable-line
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } const m: View = p.view === 'pov' && !p.selectedId ? 'orbit' : p.view; go(pose(m, p.selectedId, m === 'orbit' ? p.zone : null), 900, m); }, [p.view, p.zone, p.camKey, size.width, size.height, p.view === 'pov' ? p.selectedId : '']); // eslint-disable-line

  // a picked table must never hide behind the selected-table card: if it would, slide the room up/down by the missing amount
  const cam = camera as THREE.PerspectiveCamera, v3 = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    measured.current = false; invalidate();
    if (!p.selectedId || p.view === 'pov') return;
    const t = TABLES.find((x) => x.id === p.selectedId)!; let k = 0;
    const id = window.setTimeout(() => requestAnimationFrame(() => {
      const r = root(), card = r?.querySelector('.ps-card')?.getBoundingClientRect(), rb = r?.getBoundingClientRect(), c = ctl.current; if (!r || !rb || !c) return;
      if (tw.current) { if (k++ < 6) return; }
      v3.set(t.x, 1.3, t.z).project(cam); const py = (-v3.y * 0.5 + 0.5) * size.height, px = (v3.x * 0.5 + 0.5) * size.width, top = rect().t + 26;
      const cardTop = card ? card.top - rb.top - 14 : size.height, left = card ? card.left - rb.left - 30 : 0, rightEdge = card ? card.right - rb.left + 30 : 0;
      const under = card && px > left && px < rightEdge && py > cardTop - 30;
      let dy = 0; if (under) dy = cardTop - 30 - py; else if (py < top) dy = top - py;   // dy < 0: content must move up
      if (Math.abs(dy) < 4) return;
      const dist = camera.position.distanceTo(c.target), perPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / size.height, az = c.getAzimuthalAngle(), el = Math.PI / 2 - c.getPolarAngle();
      const shift = new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az)).multiplyScalar((dy * perPx) / Math.max(Math.sin(el), 0.35));
      go({ p: camera.position.clone().add(shift), t: c.target.clone().add(shift), fov: cam.fov }, 420, mode.current);
    }), 60);
    return () => clearTimeout(id);
  }, [p.selectedId]); // eslint-disable-line
  useEffect(() => { measured.current = false; invalidate(); }, [p.party, p.view, size.width]); // eslint-disable-line

  useFrame(() => {
    const T = tw.current, c = ctl.current; if (!c) return;
    if (T) { const k = Math.min(1, (performance.now() - T.at) / T.dur), e = ease(k); cam.position.lerpVectors(T.a.p, T.b.p, e); c.target.lerpVectors(T.a.t, T.b.t, e); cam.fov = T.a.fov + (T.b.fov - T.a.fov) * e; cam.updateProjectionMatrix(); c.update(); if (k >= 1) { tw.current = null; limits(T.mode); c.update(); } else invalidate(); }
    else if (c.update()) invalidate();
    // pins: project each table to screen space, push overlapping pins apart, write one transform per pin (no React state)
    const w = size.width, h = size.height, r = root();
    const dist = cam.position.distanceTo(c.target), zoomed = mode.current !== 'pov' && maxD.current / dist > 1.55;
    if (zoomed !== zoomOn.current) { zoomOn.current = zoomed; r?.classList.toggle('is-zoomed', zoomed); measured.current = false; }
    if (!measured.current || items.current.length !== TABLES.length) {
      items.current = TABLES.map((t) => { const el = p.pins.current.get(t.id)!; const b = el?.firstElementChild as HTMLElement | null; return { id: t.id, el, x: 0, y: 0, w: b?.offsetWidth ?? 44, h: b?.offsetHeight ?? 44, z: 0, on: false }; });
      measured.current = !items.current.some((i) => !i.el);
    }
    const L = items.current;
    TABLES.forEach((t, i) => { const it = L[i]; if (!it.el) return; v3.set(t.x, t.kind === 'lounge' ? 1.25 : 1.3, t.z).project(cam); it.z = v3.z; it.x = (v3.x * 0.5 + 0.5) * w; it.y = (-v3.y * 0.5 + 0.5) * h; it.on = v3.z <= 1 && v3.z >= -1 && it.x > -20 && it.x < w + 20 && it.y > -20 && it.y < h + 20; });
    relax(L);
    for (const it of L) { if (!it.el) continue;
      const s = it.on ? `translate3d(${it.x.toFixed(1)}px,${it.y.toFixed(1)}px,0)` : 'translate3d(-999px,-999px,0)';
      if (it.el.dataset.t !== s) { it.el.dataset.t = s; it.el.style.transform = s; it.el.style.zIndex = String(it.id === p.selectedId ? 900 : Math.round((1 - it.z) * 500)); }
    }
  });
  return null;
}

class Boundary extends Component<{ children: React.ReactNode; onFail(): void }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch(e: unknown) { console.error(e); this.props.onFail(); }
  render() { return this.state.bad ? null : this.props.children; }
}

function Scene(p: RoomProps) {
  const a = assets(), [hov, setHov] = useState<string | null>(null), { invalidate, gl } = useThree();
  const pick = useRef(p.onSelect); pick.current = p.onSelect;
  const st = (t: TableRow): St => (t.id === p.selectedId ? 'sel' : t.seats >= p.party ? 'free' : 'small');
  useEffect(() => { gl.domElement.style.cursor = hov ? 'pointer' : ''; invalidate(); }, [hov]); // eslint-disable-line
  return <>
    <Lights light={p.light} a={a} />
    <Floor a={a} /><Statics a={a} /><Decor a={a} inv={invalidate} />
    {['green', 'blue', 'wood', 'stool', 'arm'].map((k) => <Inst key={k} geo={a.geo[k]} mat={a.vc} items={LISTS[k]} />)}
    <Inst geo={a.geo.plant} mat={a.vc} items={PLANTS} />
    <Inst geo={a.geo.plate} mat={a.m.plate} items={LISTS.plate} shadow={false} />
    <Inst geo={a.geo.lamp} mat={a.m.lamp} items={LISTS.lamp} shadow={false} />
    {TABLES.map((t) => <Table key={t.id} t={t} s={st(t)} hov={hov === t.id} pick={(id) => pick.current(id)} setHov={setHov} a={a} />)}
    <Rig p={p} />
  </>;
}

export default function Room(p: RoomProps) {
  useEffect(() => () => disposeAssets(), []);
  return <Boundary onFail={p.onFail}>
    <Canvas shadows={{ type: THREE.PCFShadowMap }} frameloop="demand" dpr={[1, coarse ? 1.5 : 1.75]} camera={{ fov: 38, near: 0.1, far: 120, position: [0, 14, 20] }} gl={{ antialias: !coarse, powerPreference: 'high-performance' }}
      onCreated={({ gl, invalidate }) => {
        if (location.search.includes('debug')) (window as any).__gl = gl;
        gl.shadowMap.autoUpdate = false;   // the room is static: shadows are rendered on demand, never per frame
        const bake = () => { gl.shadowMap.needsUpdate = true; invalidate(); }; bake(); setTimeout(bake, 700);
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); p.onFail(); });
        requestAnimationFrame(() => requestAnimationFrame(() => p.onReady()));
      }}>
      <Scene {...p} />
    </Canvas>
  </Boundary>;
}
