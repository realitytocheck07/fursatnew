// "Pick your table (optional)": the island that lives INSIDE the left photo box of /reserve. 3D room + view pills + zoom, and a bottom overlay
// with zone pills and table chips. No availability is shown (nothing is faked). A pick is broadcast as window event "fk:table" for the form.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TABLES, ZONES, tableLine, zoneName, type ZoneId } from './tables.config';
import type { RoomApi, View } from './Room';

const Room = lazy(() => import('./Room'));
const VIEWS: { id: View; sm: string; lg: string }[] = [{ id: 'overview', sm: 'Overview', lg: 'Overview' }, { id: 'top', sm: 'Top', lg: 'Top' }, { id: 'eye', sm: 'Eye', lg: 'Eye level' }, { id: 'seat', sm: 'Seat', lg: 'From your seat' }];
const Check = () => <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export default function Booking3D({ onReady, reduced, desktop, flyIn = true }: { onReady(): void; reduced: boolean; desktop: boolean; flyIn?: boolean }) {
  const [sel, setSel] = useState<string | null>(null), [view, setView] = useState<View>('overview'), [zone, setZone] = useState<ZoneId | 'all'>('all');
  const api = useRef<RoomApi | null>(null), chips = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => TABLES.filter((t) => zone === 'all' || t.zone === zone), [zone]);

  const pick = useCallback((id: string | null) => {
    setSel(id); const t = TABLES.find((x) => x.id === id);
    window.dispatchEvent(new CustomEvent('fk:table', { detail: t ? { id: t.id, zone: t.zone, zoneName: zoneName(t.zone), seats: t.seats, line: tableLine(t) } : null }));
    if (!t && view === 'seat') setView('overview');
  }, [view]);
  useEffect(() => { const clear = () => { setSel(null); setView((v) => (v === 'seat' ? 'overview' : v)); }; window.addEventListener('fk:table-clear', clear); return () => window.removeEventListener('fk:table-clear', clear); }, []);

  // roving arrows between the chips (they are real buttons: Tab, Enter and Space work too)
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key; if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(k)) return;
    const b = [...(chips.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])], i = b.indexOf(document.activeElement as HTMLButtonElement); if (i < 0) return;
    e.preventDefault(); b[k === 'Home' ? 0 : k === 'End' ? b.length - 1 : (i + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + b.length) % b.length].focus();
  };
  const selT = TABLES.find((t) => t.id === sel);

  return (
    <div className="bk3d" role="group" aria-label="Pick your table (optional)">
      <div className="bk3d-stage"><Suspense fallback={null}><Room selectedId={sel} view={view} onSelect={pick} onReady={onReady} apiRef={api} reduced={reduced} desktop={desktop} flyIn={flyIn} /></Suspense></div>
      <div className="bk3d-top">
        <div className="fk-seg bk3d-views" role="group" aria-label="Camera view" data-no-thumb>
          {VIEWS.map((v) => <button key={v.id} type="button" aria-pressed={view === v.id} disabled={v.id === 'seat' && !sel} title={v.id === 'seat' && !sel ? 'Pick a table first' : undefined}
            onClick={() => setView(v.id)}><span className="bk3d-sm">{v.sm}</span><span className="bk3d-lg">{v.lg}</span></button>)}
        </div>
        <div className="bk3d-zoom"><button type="button" className="fk-pill" aria-label="Zoom in" onClick={() => api.current?.zoom(0.8)}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
          <button type="button" className="fk-pill" aria-label="Zoom out" onClick={() => api.current?.zoom(1.25)}><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button></div>
      </div>
      <div className="bk3d-bottom">
        <p className="bk3d-note" aria-live="polite">{selT ? `${tableLine(selT)}. We’ll confirm it with you on WhatsApp.` : 'Pick a table you’d like. We’ll confirm it with you on WhatsApp.'}</p>
        <div className="fk-rail bk3d-zones" role="group" aria-label="Zones">
          <button type="button" className="fk-pill" aria-pressed={zone === 'all'} onClick={() => setZone('all')}>All</button>
          {ZONES.map((z) => <button key={z.id} type="button" className="fk-pill" aria-pressed={zone === z.id} onClick={() => setZone(z.id)}>{z.name}</button>)}
        </div>
        <div className="fk-rail bk3d-chips" ref={chips} role="group" aria-label="Tables" onKeyDown={onKey}>
          {shown.map((t) => <button key={t.id} type="button" className={`fk-pill bk3d-chip${sel === t.id ? ' is-sel' : ''}`} aria-pressed={sel === t.id} onClick={() => pick(sel === t.id ? null : t.id)}>
            {sel === t.id && <Check />}<b>{t.id}</b><small>{t.seats} seats</small></button>)}
        </div>
      </div>
    </div>
  );
}
