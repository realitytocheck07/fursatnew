// Mounts the 3D island into a host element. Resolves only after the room has actually drawn its first frame; rejects (host stays untouched) if
// WebGL is missing, Save-Data is on, or anything fails to load. Heavy code (react-dom, three, Room) is a lazy chunk, fetched only when this runs.
export interface Mounted { destroy(): void; }
export async function mountBooking3D(host: HTMLElement, o: { reduced: boolean; desktop: boolean }): Promise<Mounted> {
  const c = document.createElement('canvas');
  if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no-webgl');
  const [{ createElement }, { createRoot }, { default: Booking3D }] = await Promise.all([import('react'), import('react-dom/client'), import('./Booking3D')]);
  return new Promise<Mounted>((resolve, reject) => {
    const root = createRoot(host); let done = false;
    const t = window.setTimeout(() => { if (!done) { done = true; root.unmount(); reject(new Error('timeout')); } }, 15000);
    root.render(createElement(Booking3D, { reduced: o.reduced, desktop: o.desktop, onReady: () => { if (done) return; done = true; clearTimeout(t); resolve({ destroy: () => root.unmount() }); } }));
  });
}
