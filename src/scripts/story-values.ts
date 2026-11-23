// Story page: mascot greeting + values pop. Pure class toggles; every animation is CSS (transform/opacity only) in story.astro.
// Plays once per page visit: .is-in is added on first view and the observer is dropped. The mascot's idle float is paused while it is off screen (.is-off).
const once = (el: Element | null, margin: string, threshold: number, fn: () => void) => {
  if (!el) return;
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: margin, threshold });
  io.observe(el);
};
const mascot = document.querySelector<HTMLElement>('[data-st-mascot]');
once(mascot, '0px 0px -8% 0px', 0.35, () => {
  mascot!.classList.add('is-in');
  const live = new IntersectionObserver((es) => {
    es.forEach((e) => mascot!.classList.toggle('is-off', !e.isIntersecting));
  }, { threshold: 0 });
  live.observe(mascot!);
});
const values = document.querySelector<HTMLElement>('[data-st-values]');
once(values, '0px 0px -10% 0px', 0.2, () => values!.classList.add('is-in'));
// iOS only fires :active (the tap lift) when something listens for touch
document.addEventListener('touchstart', () => {}, { passive: true });
