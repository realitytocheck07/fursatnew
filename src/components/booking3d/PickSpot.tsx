// "Pick your spot": the full-screen dialog UI around the 3D room. Loaded only after the guest taps the preview (mount.ts).
// A choice is broadcast as window event "fk:table" { id, zone, zoneName, seats, line } (same name and payload as always); "fk:table-clear" clears it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Room, { type Light, type RoomApi, type View } from './Room';
import { TABLES, ZONES, detailOf, zoneName, type TableRow, type ZoneId } from './tables.config';
import { bus } from './bus';
import css from './dialog.css?inline';

const I = {
  orbit: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="M3 13l9 5 9-5" /></svg>,
  plan: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 11h7M10.5 11v8.5M14 4.5v6" /></svg>,
  pov: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></svg>,
  afternoon: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></svg>,
  sunset: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 16a5.5 5.5 0 0 1 11 0" /><path d="M2.5 16h19M5 20h14M12 5v3M4.6 9.6 6 11M19.4 9.6 18 11" /></svg>,
  night: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></svg>,
};
const VIEWS: { id: View; label: string; short: string }[] = [{ id: 'orbit', label: '3D orbit', short: '3D' }, { id: 'plan', label: 'Floor plan', short: 'Plan' }, { id: 'pov', label: 'From your seat', short: 'Your seat' }];
const LIGHTS: { id: Light; label: string }[] = [{ id: 'afternoon', label: 'Afternoon' }, { id: 'sunset', label: 'Sunset' }, { id: 'night', label: 'Night' }];

/** party size comes from the form's guests stepper (read-only: the form is not touched) */
const readParty = () => { const n = parseInt(document.getElementById('rs-g-n')?.textContent ?? '', 10); return n > 0 ? n : 2; };
function useParty() {
  const [n, setN] = useState(readParty);
  useEffect(() => { const el = document.getElementById('rs-g-n'); if (!el) return; const mo = new MutationObserver(() => setN(readParty())); mo.observe(el, { childList: true, characterData: true, subtree: true }); return () => mo.disconnect(); }, []);
  return n;
}

export function injectCss() { if (document.getElementById('ps-css')) return; const s = document.createElement('style'); s.id = 'ps-css'; s.textContent = css; document.head.append(s); }

export default function PickSpot({ onClose, onReady, onFail, flyIn = true }: { onClose(): void; onReady(): void; onFail(): void; flyIn?: boolean }) {
  injectCss();
  const [sel, setSel] = useState<string | null>(bus.sel), [view, setView] = useState<View>('orbit'), [light, setLight] = useState<Light>(bus.light), [camKey, setCamKey] = useState(0), [zone, setZone] = useState<ZoneId | null>(null), [hint, setHint] = useState(true);
  const party = useParty(), pins = useRef(new Map<string, HTMLElement>()), api = useRef<RoomApi | null>(null), drag = useRef<{ x: number; y: number } | null>(null);
  const selT = useMemo(() => TABLES.find((t) => t.id === sel) ?? null, [sel]);

  useEffect(() => { const f = (l: Light) => setLight(l); bus.subs.add(f); return () => { bus.subs.delete(f); }; }, []);
  useEffect(() => { bus.light = light; }, [light]);
  const choose = useCallback((id: string) => { bus.sel = id; setSel(id); setHint(false); }, []);
  const commit = () => { if (!selT) return; window.dispatchEvent(new CustomEvent('fk:table', { detail: detailOf(selT) })); onClose(); };
  // details live in the label read by screen readers and in the card; the pin itself carries only what fits
  const tell = (t: TableRow) => `${t.id}, ${t.seats} seats, ${zoneName(t.zone)}${t.seats < party ? `. Too small for ${party} guests` : ''}`;
  const pickView = (v: View) => { setView(v); setZone(null); setCamKey((k) => k + 1); };
  const pickZone = (z: ZoneId | null) => { setZone(z); if (view !== 'orbit') setView('orbit'); setCamKey((k) => k + 1); };
  // the hint fades after the first drag (or the first pick)
  const down = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; };
  const move = (e: React.PointerEvent) => { const d = drag.current; if (d && hint && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) setHint(false); };

  return (
    <div className="ps-root" role="group" aria-label="Pick your spot">
      <div className="ps-stage" data-view={view} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }}>
        <Room selectedId={sel} party={party} view={view} light={light} zone={zone} camKey={camKey} flyIn={flyIn} onSelect={choose} onReady={onReady} onFail={onFail} pins={pins} apiRef={api} />
      </div>
      <div className="ps-pins">
        {TABLES.map((t) => { const small = t.seats < party; return (
          <div key={t.id} className={`ps-pin${t.id === sel ? ' is-sel' : small ? ' is-small' : ''}`} ref={(el) => { if (el) pins.current.set(t.id, el); else pins.current.delete(t.id); }} style={{ transform: 'translate3d(-999px,-999px,0)' }}>
            <button type="button" aria-pressed={t.id === sel} aria-label={tell(t)} onClick={() => choose(t.id)}>
              <span>{t.id}<i> · {t.seats}</i></span>
            </button>
          </div>); })}
      </div>
      <div className="ps-top">
        <div className="ps-head">
          <div className="ps-title"><b>Pick your spot</b><span>A table preference — we confirm on WhatsApp</span></div>
          <button type="button" className="ps-x" aria-label="Close" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </div>
        <div className="ps-zones" role="group" aria-label="Jump to a zone">
          <button type="button" aria-pressed={zone === null && view === 'orbit'} onClick={() => pickZone(null)}>All</button>
          {ZONES.map((z) => <button key={z.id} type="button" aria-pressed={zone === z.id} onClick={() => pickZone(z.id)}>{z.name}</button>)}
        </div>
      </div>
      <div className="ps-dock">
        {selT && <div className="ps-card" key={selT.id} role="status">
          <span className="ps-card-id" aria-hidden="true">{selT.id}</span>
          <div className="ps-card-t"><b>{selT.seats} seats · {zoneName(selT.zone)}</b><span>{selT.seats < party ? `Too small for ${party} guests` : 'A table preference — we confirm on WhatsApp'}</span></div>
          <button type="button" className="ps-go" onClick={commit}>Choose this table</button>
        </div>}
        {!selT && <p className={`ps-hint${hint ? '' : ' is-off'}`} aria-hidden={!hint}>Drag to look around · tap a table</p>}
        <div className="ps-bar">
          <div className="ps-seg" role="group" aria-label="Camera view">
            {VIEWS.map((v) => <button key={v.id} type="button" aria-pressed={view === v.id} aria-label={v.label} disabled={v.id === 'pov' && !sel} title={v.id === 'pov' && !sel ? 'Pick a table first' : undefined} onClick={() => pickView(v.id)}>{I[v.id]}<span className="ps-lg">{v.label}</span><span className="ps-sm">{v.short}</span></button>)}
          </div>
          <div className="ps-seg ps-seg--light" role="group" aria-label="Lighting">
            {LIGHTS.map((l) => <button key={l.id} type="button" aria-pressed={light === l.id} aria-label={l.label} onClick={() => setLight(l.id)}>{I[l.id]}<span className="ps-lg">{l.label}</span></button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
