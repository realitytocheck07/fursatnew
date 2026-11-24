// Story page: values pop. Pure class toggle; the animation is CSS (transform/opacity only) in story.astro. The chapter mascots live in public/js/mx-mascot.js (data-mx="ch").
const once = (el: Element | null, margin: string, threshold: number, fn: () => void) => {
  if (!el) return;
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: margin, threshold });
  io.observe(el);
};
const values = document.querySelector<HTMLElement>('[data-st-values]');
once(values, '0px 0px -10% 0px', 0.2, () => values!.classList.add('is-in'));
// iOS only fires :active (the tap lift) when something listens for touch
document.addEventListener('touchstart', () => {}, { passive: true });
