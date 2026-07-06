export function initMagnetic(elements) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(pointer: coarse)').matches) return;

  elements.forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${(x * 0.3).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)';
      el.style.transform = '';
      setTimeout(() => {
        el.style.transition = '';
      }, 450);
    });
  });
}
