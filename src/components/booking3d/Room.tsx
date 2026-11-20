// The 3D room (R3F v9 + three addons only: no drei). On-demand rendering, DPR <= 1.5, instanced chairs, baked-AO planes (no real shadows).
// Evening look: ACES tone mapping, warm key + 2 pendant point lights + 1 gold selection light (3 dynamic lights), RoomEnvironment reflections,
// bloom on bright lamps/candles (desktop only), candle flicker + plant sway + haze (all stop under reduced motion / hidden tab).
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TABLES, ROOM, tableLine, type TableRow } from './tables.config';
import { layoutOf, type Layout } from './layout';

export type View = 'overview' | 'top' | 'eye' | 'seat';
export interface RoomApi { zoom(f: number): void; }
interface Props { selectedId: string | null; view: View; onSelect(id: string): void; onReady(): void; apiRef: { current: RoomApi | null }; reduced: boolean; desktop: boolean; flyIn: boolean; tables?: TableRow[]; }

const GOLD = '#e6b85c', V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/* ── textures (small webp files made from the real zone photos) ── */
function useTex() {
  const invalidate = useThree((s) => s.invalidate), gl = useThree((s) => s.gl);
  return useMemo(() => {
    const L = new THREE.TextureLoader(), mk = (f: string, rx = 1, ry = 1, rep = false) => {
      const t = L.load('/assets/booking3d/' + f, () => invalidate());
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
      if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); } return t;
    };
    return { elephant: mk('elephant.webp'), backbar: mk('backbar.webp'), redwall: mk('redwall.webp'), walnut: mk('walnut.webp', 1, 1, true), floor: mk('floor.webp', 17, 10, true) };
  }, [invalidate, gl]);
}
const radial = (rgba: string) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, rgba); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

/* ── per-table geometry kit (shared across all tables) ── */
const chairGeo = (stool: boolean) => mergeGeometries(stool
  ? [new THREE.CylinderGeometry(0.2, 0.2, 0.07, 14).translate(0, 0.68, 0), new THREE.CylinderGeometry(0.03, 0.03, 0.66, 6).translate(0, 0.33, 0), new THREE.CylinderGeometry(0.17, 0.17, 0.03, 12).translate(0, 0.02, 0)]
  : [box(0.44, 0.08, 0.44, 0, 0.45, 0), box(0.44, 0.46, 0.06, 0, 0.72, -0.2), box(0.04, 0.44, 0.04, -0.19, 0.22, 0.18), box(0.04, 0.44, 0.04, 0.19, 0.22, 0.18), box(0.04, 0.44, 0.04, -0.19, 0.22, -0.18), box(0.04, 0.44, 0.04, 0.19, 0.22, -0.18)])!;

const CHAIR_COL: Record<string, string> = { bar: '#2f5a35', high: '#6d7076', dining: '#2d4a78', long: '#4a4b4f', booths: '#2f5a35', mural: '#2f5a35', lounge: '#2f5a35', cafe: '#c9a36a' };

function Furniture({ tables, selectedId, reduced }: { tables: TableRow[]; selectedId: string | null; reduced: boolean }) {
  const { invalidate } = useThree(), tex = useTex();
  const lay = useMemo(() => tables.map((t) => layoutOf(t)), [tables]);
  const level = useRef<number[]>([]), groups = useRef<(THREE.Group | null)[]>([]), halos = useRef<(THREE.Mesh | null)[]>([]);
  const flames = useRef<(THREE.Mesh | null)[]>([]);
  const geo = useMemo(() => ({ chair: chairGeo(false), stool: chairGeo(true) }), []);
  const mats = useMemo(() => ({
    wood: new THREE.MeshStandardMaterial({ map: tex.walnut, roughness: 0.55, metalness: 0.02, color: '#d9b48c' }),
    brass: new THREE.MeshStandardMaterial({ color: '#b8893a', metalness: 1, roughness: 0.32 }),
    velvet: new THREE.MeshPhysicalMaterial({ color: '#a32718', roughness: 0.85, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color('#e86a52') }),
    teal: new THREE.MeshPhysicalMaterial({ color: '#6fa3a0', roughness: 0.85, sheen: 1, sheenColor: new THREE.Color('#bfe0dc') }),
    chair: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.72, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff') }),
    candle: new THREE.MeshStandardMaterial({ color: '#f1e4c8', roughness: 0.6 }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffd98a' }),
    ao: new THREE.MeshBasicMaterial({ map: radial('rgba(10,6,2,.55)'), transparent: true, depthWrite: false }),
    halo: new THREE.MeshBasicMaterial({ map: radial('rgba(255,196,96,.95)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
    hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  }), [tex]);

  // chair instances: one InstancedMesh per kind, per-instance colour by zone
  const inst = useMemo(() => {
    const out = { chair: [] as { ti: number; c: number }[], stool: [] as { ti: number; c: number }[] };
    tables.forEach((t, ti) => { if (t.shape === 'sofa') return; lay[ti].chairs.forEach((_, c) => out[lay[ti].stool ? 'stool' : 'chair'].push({ ti, c })); });
    return out;
  }, [tables, lay]);
  const refs = { chair: useRef<THREE.InstancedMesh>(null), stool: useRef<THREE.InstancedMesh>(null) };
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const place = (ti: number, lv: number) => (['chair', 'stool'] as const).forEach((k) => {
    const m = refs[k].current; if (!m) return;
    inst[k].forEach((it, i) => {
      if (it.ti !== ti) return; const t = tables[ti], ch = lay[ti].chairs[it.c], len = Math.hypot(ch.x, ch.z) || 1, off = 0.13 * lv + (lay[ti].stool ? 0 : 0);
      const c = Math.cos(t.rotation), s = Math.sin(t.rotation), lx = ch.x + (ch.x / len) * off, lz = ch.z + (ch.z / len) * off;
      dummy.position.set(t.x + lx * c + lz * s, 0.05 * lv, t.z - lx * s + lz * c); dummy.rotation.set(0, t.rotation + ch.a, 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    }); m.instanceMatrix.needsUpdate = true;
  });
  useEffect(() => { (['chair', 'stool'] as const).forEach((k) => { const m = refs[k].current; if (!m) return; inst[k].forEach((it, i) => m.setColorAt(i, new THREE.Color(CHAIR_COL[tables[it.ti].zone]))); if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    tables.forEach((_, i) => { level.current[i] = 0; place(i, 0); }); invalidate(); }, [tables, inst]); // eslint-disable-line

  useFrame((s, dt) => {
    let busy = false;
    tables.forEach((t, i) => {
      const target = t.id === selectedId ? 1 : 0, cur = level.current[i] ?? 0;
      if (Math.abs(target - cur) > 0.002) { const n = reduced ? target : cur + (target - cur) * Math.min(1, dt * 9); level.current[i] = Math.abs(target - n) < 0.004 ? target : n; busy = true;
        const g = groups.current[i], h = halos.current[i], lv = level.current[i]; if (g) g.position.y = 0.05 * lv; if (h) (h.material as THREE.MeshBasicMaterial).opacity = lv * 0.9; place(i, lv); }
    });
    if (!reduced && !document.hidden) flames.current.forEach((f, i) => { if (f) f.scale.setScalar(0.85 + 0.25 * Math.sin(s.clock.elapsedTime * 9 + i * 1.7) * Math.sin(s.clock.elapsedTime * 5.3 + i)); });
    if (busy) invalidate();
  });

  return <>
    {(['chair', 'stool'] as const).map((k) => inst[k].length > 0 && <instancedMesh key={k + inst[k].length} ref={refs[k]} args={[geo[k], mats.chair, inst[k].length]} frustumCulled={false} />)}
    {tables.map((t, i) => { const L: Layout = lay[i], r = L.round ? L.w / 2 : Math.max(L.w, L.d) / 2; return (
      <group key={t.id} position={[t.x, 0, t.z]} rotation={[0, t.rotation, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={mats.ao}><planeGeometry args={[L.w + 1.6, L.d + 1.6]} /></mesh>
        <mesh ref={(m) => { halos.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={mats.halo}><planeGeometry args={[Math.max(L.w, L.d) + 2.2, Math.max(L.w, L.d) + 2.2]} /></mesh>
        <group ref={(g) => { groups.current[i] = g; }}>
          {t.shape === 'sofa' ? <>
            <mesh position={[0, 0.2, 0]} material={mats.wood}><cylinderGeometry args={[0.45, 0.45, 0.04, 24]} /></mesh><mesh position={[0, 0.1, 0]} material={mats.brass}><cylinderGeometry args={[0.06, 0.06, 0.2, 8]} /></mesh>
            <mesh position={[0, 0.2, 0]} rotation={[0, Math.PI * 0.55, 0]} material={mats.velvet}><cylinderGeometry args={[1.25, 1.25, 0.4, 28, 1, false, 0, Math.PI * 1.1]} /></mesh>
            <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI * 0.55, 0]} material={mats.velvet}><cylinderGeometry args={[1.3, 1.3, 0.55, 28, 1, true, 0, Math.PI * 1.1]} /></mesh>
          </> : <>
            <mesh position={[0, L.h, 0]} material={mats.wood}>{L.round ? <cylinderGeometry args={[L.w / 2, L.w / 2, 0.05, 28]} /> : <boxGeometry args={[L.w, 0.05, L.d]} />}</mesh>
            {L.round || t.shape === 'rect' && L.d < 2 ? <mesh position={[0, L.h / 2, 0]} material={mats.brass}><cylinderGeometry args={[0.05, 0.1, L.h, 10]} /></mesh>
              : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], q) => <mesh key={q} position={[a * (L.w / 2 - 0.08), L.h / 2, b * (L.d / 2 - 0.08)]} material={mats.brass}><boxGeometry args={[0.05, L.h, 0.05]} /></mesh>)}
            <mesh position={[0.18 * (i % 3 - 1), L.h + 0.07, 0.1]} material={mats.candle}><cylinderGeometry args={[0.025, 0.025, 0.1, 8]} /></mesh>
            <mesh ref={(m) => { flames.current[i] = m; }} position={[0.18 * (i % 3 - 1), L.h + 0.15, 0.1]} material={mats.flame}><sphereGeometry args={[0.02, 8, 6]} /></mesh>
          </>}
          {L.banquette && <>
            <mesh position={[0, 0.25, -(L.d / 2 + 0.3)]} material={mats.velvet}><boxGeometry args={[L.w + 0.3, 0.5, 0.55]} /></mesh>
            <mesh position={[0, 0.75, -(L.d / 2 + 0.55)]} material={mats.velvet}><boxGeometry args={[L.w + 0.3, 0.6, 0.12]} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[s * (L.w / 2 + 0.17), 0.5, -(L.d / 2 + 0.3)]} material={mats.velvet}><boxGeometry args={[0.1, 1, 0.65]} /></mesh>)}
          </>}
        </group>
        {/* invisible, generous hit area: easy to tap on a phone */}
        <mesh position={[0, 0.5, 0]} material={mats.hit} userData={{ id: t.id }}><boxGeometry args={[Math.max(L.w, L.d) + 1.1 * (L.w >= L.d ? 1 : 0.8), 1.1, (L.w >= L.d ? L.d : L.w) + 1.4]} /></mesh>
      </group>); })}
  </>;
}

/* ── the room shell: floor, walls with the real mural / back-bar / red wall, pendants, plants ── */
function Shell({ reduced }: { reduced: boolean }) {
  const tex = useTex(), plants = useRef<THREE.Group[]>([]), W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0;
  const haze = useMemo(() => radial('rgba(255,214,150,.5)'), []);
  const plaster = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b9694a', roughness: 0.92 }), []);
  const cream = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8dbc2', roughness: 0.9 }), []);
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8893a', metalness: 1, roughness: 0.3, side: THREE.DoubleSide }), []);
  const bulb = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff0cf', emissive: '#ffcf84', emissiveIntensity: 4 }), []);
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f6a36', roughness: 0.8, flatShading: true }), []);
  const pot = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7b4a32', roughness: 0.8 }), []);
  const rug = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d2a22', roughness: 1 }), []);
  const pend: [number, number, number][] = [[-6, 3, -3.7], [-1.6, 3, -4.2], [0.8, 3, -4.2], [-3.2, 3, -0.6], [-0.6, 3, -0.6], [2.2, 3, 0.2], [6.2, 3, -3.6], [-0.7, 3, 2.8]];
  const spots: [number, number][] = [[-10, -5.3], [-9.8, 5.6], [9.9, 5.7], [2.8, -5.5], [-2.6, 5.7]];
  useFrame((s) => { if (reduced || document.hidden) return; plants.current.forEach((g, i) => { if (g) g.rotation.z = Math.sin(s.clock.elapsedTime * 0.7 + i) * 0.025; }); });
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(ROOM.x0 + ROOM.x1) / 2, 0, (ROOM.z0 + ROOM.z1) / 2]}><planeGeometry args={[W, D]} /><meshStandardMaterial map={tex.floor} color="#bdb3a0" roughness={0.5} metalness={0.05} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, 0.01, 3.7]} material={rug}><circleGeometry args={[3.3, 32]} /></mesh>
    <mesh position={[(ROOM.x0 + ROOM.x1) / 2, 2, ROOM.z0]} material={plaster}><planeGeometry args={[W, 4]} /></mesh>
    <mesh position={[ROOM.x0, 2, (ROOM.z0 + ROOM.z1) / 2]} rotation={[0, Math.PI / 2, 0]} material={cream}><planeGeometry args={[D, 4]} /></mesh>
    <mesh position={[ROOM.x1, 2, (ROOM.z0 + ROOM.z1) / 2]} rotation={[0, -Math.PI / 2, 0]} material={cream}><planeGeometry args={[D, 4]} /></mesh>
    {/* real photo textures: hex back-bar (glows), red Fursat wall behind the booths, elephant mural on the left wall */}
    <mesh position={[-6, 2.05, ROOM.z0 + 0.02]}><planeGeometry args={[6.4, 3]} /><meshStandardMaterial map={tex.backbar} emissiveMap={tex.backbar} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.4} /></mesh>
    <mesh position={[6.2, 2, ROOM.z0 + 0.02]}><planeGeometry args={[7.6, 3.3]} /><meshStandardMaterial map={tex.redwall} emissiveMap={tex.redwall} emissive="#ffffff" emissiveIntensity={0.22} roughness={0.8} /></mesh>
    <mesh position={[ROOM.x0 + 0.02, 2, -2.2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.9, 4]} /><meshStandardMaterial map={tex.elephant} roughness={0.85} /></mesh>
    <mesh position={[-6, 0.52, -5.35]} material={lampMat}><boxGeometry args={[5.6, 1.04, 0.6]} /></mesh>
    {pend.map(([x, y, z], i) => <group key={i} position={[x, y, z]}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.006, 0.006, 1, 4]} /><meshBasicMaterial color="#222" /></mesh>
      <mesh material={lampMat}><coneGeometry args={[0.24, 0.26, 20, 1, true]} /></mesh>
      <mesh position={[0, -0.08, 0]} material={bulb}><sphereGeometry args={[0.07, 12, 10]} /></mesh>
      <sprite position={[0, -0.5, 0]} scale={[1.6, 1.6, 1]}><spriteMaterial map={haze} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    </group>)}
    {spots.map(([x, z], i) => <group key={i} position={[x, 0, z]} ref={(g) => { if (g) plants.current[i] = g; }}>
      <mesh position={[0, 0.25, 0]} material={pot}><cylinderGeometry args={[0.3, 0.22, 0.5, 12]} /></mesh>
      {[[0, 0.9, 0, 0.42], [0.2, 1.25, 0.1, 0.3], [-0.18, 1.5, -0.05, 0.26]].map(([a, b, c, r], k) => <mesh key={k} position={[a, b, c]} material={leaf}><icosahedronGeometry args={[r, 1]} /></mesh>)}
    </group>)}
    <hemisphereLight args={['#ffd9a8', '#3a2418', 0.5]} />
    <directionalLight position={[6, 10, 7]} intensity={1.1} color="#ffb878" />
    <pointLight position={[-2, 2.6, -2]} intensity={14} distance={11} decay={2} color="#ffb765" />
    <pointLight position={[5.5, 2.6, -2.5]} intensity={12} distance={10} decay={2} color="#ffb060" />
  </>;
}

/* ── camera: views, 2 s fly-in, controls, bloom/DoF ── */
function Rig({ view, selected, reduced, desktop, flyIn, onReady, apiRef }: { view: View; selected: TableRow | null } & Pick<Props, 'reduced' | 'desktop' | 'flyIn' | 'onReady' | 'apiRef'>) {
  const { camera, gl, scene, invalidate, size } = useThree();
  const ctl = useRef<OrbitControls>(), tw = useRef<{ p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; at: number; dur: number } | null>(null);
  const comp = useRef<{ c: EffectComposer; bokeh: BokehPass } | null>(null), first = useRef(true), seat = useRef(false);
  const goal = (v: View, t: TableRow | null) => {
    const wide = size.width / size.height < 1;
    if (v === 'top') return { p: V(0, wide ? 25 : 19, 0.01), t: V(0, 0, 0.2) };
    if (v === 'eye') return { p: V(-0.5, 1.65, 6.2), t: V(0.5, 1.1, -3) };
    if (v === 'seat' && t) { const c = Math.cos(t.rotation), s = Math.sin(t.rotation), f = (x: number, z: number) => V(t.x + x * c + z * s, 0, t.z - x * s + z * c);
      const a = f(0, 0.8), b = f(0, 6); return { p: V(a.x, 1.18, a.z), t: V(b.x, 0.9, b.z) }; }
    return { p: wide ? V(7, 15, 17) : V(8, 11.5, 15), t: V(0, 0.2, 0) };
  };
  const go = (g: { p: THREE.Vector3; t: THREE.Vector3 }, dur: number, from?: { p: THREE.Vector3; t: THREE.Vector3 }) => {
    const c = ctl.current!; tw.current = { p0: from ? from.p : camera.position.clone(), t0: from ? from.t : c.target.clone(), p1: g.p, t1: g.t, at: performance.now(), dur: reduced ? 1 : dur }; invalidate();
  };
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement); ctl.current = c;
    c.maxPolarAngle = Math.PI / 2 - 0.04; c.minDistance = 0.8; c.maxDistance = 30; c.screenSpacePanning = false; c.zoomSpeed = 0.8;
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    c.addEventListener('change', () => { const t = c.target; t.x = THREE.MathUtils.clamp(t.x, ROOM.x0, ROOM.x1); t.z = THREE.MathUtils.clamp(t.z, ROOM.z0, ROOM.z1); invalidate(); });
    (camera as THREE.PerspectiveCamera).fov = 38; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    const env = new THREE.PMREMGenerator(gl), rt = env.fromScene(new RoomEnvironment(), 0.04); scene.environment = rt.texture; scene.environmentIntensity = 0.32; env.dispose();
    scene.fog = new THREE.Fog('#16301a', 28, 60);
    apiRef.current = { zoom: (f) => { const d = camera.position.clone().sub(c.target).multiplyScalar(f); if (d.length() > c.minDistance && d.length() < c.maxDistance) { camera.position.copy(c.target).add(d); c.update(); invalidate(); } } };
    const g = goal('overview', null);
    if (flyIn && !reduced) { camera.position.set(-8.6, 1.7, 3.8); c.target.set(-10.5, 1.6, -1.5); c.update(); go(g, 2000, { p: camera.position.clone(), t: c.target.clone() }); } else { camera.position.copy(g.p); c.target.copy(g.t); c.update(); }
    if (desktop && !reduced) { try { const cm = new EffectComposer(gl); cm.addPass(new RenderPass(scene, camera));
      const bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.00018, maxblur: 0.007 }); bokeh.enabled = false; cm.addPass(bokeh);
      cm.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.45, 0.5, 0.92)); cm.addPass(new OutputPass()); comp.current = { c: cm, bokeh }; } catch { comp.current = null; } }
    invalidate();
    return () => { c.dispose(); comp.current?.c.dispose(); apiRef.current = null; };
  }, []); // eslint-disable-line
  useEffect(() => { comp.current?.c.setSize(size.width, size.height); }, [size]);
  useEffect(() => { if (!ctl.current || first.current) { first.current = false; return; } seat.current = view === 'seat'; if (comp.current) comp.current.bokeh.enabled = seat.current; go(goal(view, selected), 900); }, [view]); // eslint-disable-line
  useEffect(() => { if (view === 'seat' && ctl.current) go(goal('seat', selected), 700); }, [selected?.id]); // eslint-disable-line
  const drawn = useRef(false);
  useFrame((s) => {
    const T = tw.current, c = ctl.current;
    if (T && c) { const k = Math.min(1, (performance.now() - T.at) / T.dur), e = ease(k); camera.position.lerpVectors(T.p0, T.p1, e); c.target.lerpVectors(T.t0, T.t1, e); c.update(); if (k >= 1) tw.current = null; else invalidate(); }
    if (comp.current) { s.gl.autoClear = false; comp.current.c.render(); } else s.gl.render(s.scene, s.camera);
    if (!drawn.current) { drawn.current = true; requestAnimationFrame(() => onReady()); }
  }, 1);
  return null;
}

function Label({ t }: { t: TableRow | null }) {
  const sprite = useRef<THREE.Sprite>(null), tex = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 112; return new THREE.CanvasTexture(c); }, []);
  const { invalidate } = useThree();
  useEffect(() => { if (!t) { if (sprite.current) sprite.current.visible = false; invalidate(); return; }
    const c = tex.image as HTMLCanvasElement, g = c.getContext('2d')!; g.clearRect(0, 0, 512, 112);
    g.fillStyle = 'rgba(251,243,226,.96)'; g.strokeStyle = GOLD; g.lineWidth = 5; g.beginPath(); g.roundRect(6, 10, 500, 92, 46); g.fill(); g.stroke();
    g.fillStyle = '#2b2416'; g.font = '600 38px Poppins, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tableLine(t).replace(' seats', ''), 256, 58);
    tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; const sp = sprite.current!; sp.visible = true; sp.position.set(t.x, layoutOf(t).h + 1.15, t.z); invalidate(); }, [t?.id]); // eslint-disable-line
  return <sprite ref={sprite} visible={false} scale={[1.9, 0.42, 1]}><spriteMaterial map={tex} transparent depthTest={false} toneMapped={false} /></sprite>;
}

function Gold({ t }: { t: TableRow | null }) {
  const l = useRef<THREE.PointLight>(null), { invalidate } = useThree();
  useEffect(() => { const p = l.current; if (!p) return; p.intensity = t ? 5 : 0; if (t) p.position.set(t.x, 1.6, t.z); invalidate(); }, [t?.id]); // eslint-disable-line
  return <pointLight ref={l} color={GOLD} intensity={0} distance={4.5} decay={2} />;
}

export default function Room(p: Props) {
  const tables = p.tables ?? TABLES, sel = tables.find((t) => t.id === p.selectedId) ?? null, ticker = useRef(0);
  // life: gentle ~20 fps redraw only while visible, awake and motion allowed
  const inv = useRef<() => void>(() => {});
  useEffect(() => { if (p.reduced) return; ticker.current = window.setInterval(() => { if (!document.hidden) inv.current(); }, 60); return () => clearInterval(ticker.current); }, [p.reduced]);
  return (
    <Canvas frameloop="demand" dpr={[1, p.desktop ? 1.5 : 1.25]} gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      camera={{ fov: 38, near: 0.1, far: 80, position: [8, 11, 15] }} onCreated={({ invalidate }) => { inv.current = invalidate; }} style={{ touchAction: 'none' }}
      onPointerMissed={() => {}}>
      <Shell reduced={p.reduced} />
      <TableLayer {...p} tables={tables} />
      <Gold t={sel} /><Label t={sel} />
      <Rig view={p.view} selected={sel} reduced={p.reduced} desktop={p.desktop} flyIn={p.flyIn} onReady={p.onReady} apiRef={p.apiRef} />
    </Canvas>
  );
}

function TableLayer(p: Props & { tables: TableRow[] }) {
  const onClick = (e: ThreeEvent<MouseEvent>) => { const id = e.object.userData?.id; if (id) { e.stopPropagation(); p.onSelect(id); } };
  const over = (e: ThreeEvent<PointerEvent>) => { if (e.object.userData?.id) document.body.style.cursor = 'pointer'; };
  return <group onClick={onClick} onPointerOver={over} onPointerOut={() => { document.body.style.cursor = ''; }}><Furniture tables={p.tables} selectedId={p.selectedId} reduced={p.reduced} /></group>;
}
