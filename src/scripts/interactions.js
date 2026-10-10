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

// 悬停时字符先乱码再逐位还原。全角字符用全角符号乱码，宽度不跳动
const HALF = '#%&*+=/<>@$?!';
const FULL = '＃％＆＊＋＝／＜＞＠＄？';

export function initScramble(elements) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  elements.forEach((el) => {
    const text = el.textContent;
    let raf = 0;
    el.addEventListener('pointerenter', () => {
      cancelAnimationFrame(raf);
      const start = performance.now();
      const tick = (now) => {
        const done = Math.floor((now - start) / 45);
        el.textContent = [...text]
          .map((ch, i) => {
            if (i < done || ch === ' ') return ch;
            const pool = ch.charCodeAt(0) > 0x2e80 ? FULL : HALF;
            return pool[Math.floor(Math.random() * pool.length)];
          })
          .join('');
        if (done < text.length) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
  });
}
