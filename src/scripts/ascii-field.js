// hero 的 ASCII 引力场：几个"质量"叠加出势能场，
// 势能高处用密集字符，外围是一张被质量吸弯的网格；指针本身也是一个质量。

const RAMP = ' .:-=+*#%@';
const LX = 6;
const LY = 3;
const CELL_W = 9;
const CELL_H = 16;

export function initAsciiField(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cols = 0;
  let rows = 0;
  let w = 0;
  let h = 0;
  let ink = '#111';
  let accent = '#e1251b';
  let faint = '#999';

  function readColors() {
    const styles = getComputedStyle(canvas);
    ink = styles.color;
    accent = styles.getPropertyValue('--vermillion').trim() || accent;
    faint = styles.getPropertyValue('--ink-3').trim() || faint;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.floor(w / CELL_W);
    rows = Math.floor(h / CELL_H);
    readColors();
    if (still) draw(0);
  }

  // 指针质量：缓动跟随，离开后回到画面中心偏右
  let px = 0.62;
  let py = 0.5;
  let tx = px;
  let ty = py;
  canvas.parentElement.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width;
    ty = (e.clientY - r.top) / r.height;
  });
  canvas.parentElement.addEventListener('pointerleave', () => {
    tx = 0.62;
    ty = 0.5;
  });

  function masses(t) {
    const s = t * 0.00025;
    return [
      { x: px, y: py, m: 1.0 },
      { x: 0.5 + Math.cos(s) * 0.32, y: 0.5 + Math.sin(s * 1.3) * 0.3, m: 0.55 },
      { x: 0.5 + Math.cos(s * 0.7 + 2) * 0.38, y: 0.5 + Math.sin(s * 0.9 + 1) * 0.34, m: 0.35 },
    ];
  }

  function draw(t) {
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    const ms = masses(t);
    const aspect = w / h;
    // 网格线间距：横向每 LX 个字符一条竖线，纵向每 LY 行一条横线
    const nx = cols / LX;
    const ny = rows / LY;

    ctx.clearRect(0, 0, w, h);
    ctx.font = `13px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = 'top';

    for (let r = 0; r < rows; r++) {
      const v = (r + 0.5) / rows;
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        let pot = 0;
        let qx = u;
        let qy = v;
        for (const m of ms) {
          const dx = (u - m.x) * aspect;
          const dy = v - m.y;
          const d2 = dx * dx + dy * dy;
          const d = Math.sqrt(d2) + 1e-4;
          pot += m.m / (d2 + 0.004);
          // 网格被质量吸过去：显示点往外取样，越近偏移越大
          const pull = Math.min(d * 0.85, (m.m * 0.009) / (d + 0.08));
          qx += ((dx / d) * pull) / aspect;
          qy += (dy / d) * pull;
        }
        const x = c * CELL_W;
        const y = r * CELL_H;

        if (pot > 22) {
          // 质量核心：按势能取字符，最内圈用强调色
          const k = Math.min(1, (pot - 22) / 140);
          ctx.globalAlpha = 1;
          ctx.fillStyle = pot > 110 ? accent : ink;
          ctx.fillText(RAMP[1 + Math.floor(k * (RAMP.length - 2))], x, y);
          continue;
        }

        const fx = qx * nx - Math.floor(qx * nx);
        const fy = qy * ny - Math.floor(qy * ny);
        const onX = fx < 1 / LX;
        const onY = fy < 1 / LY;
        if (!onX && !onY) continue;
        // 越靠近质量，网格越深
        ctx.globalAlpha = Math.min(1, 0.35 + pot / 14);
        ctx.fillStyle = pot > 4 ? ink : faint;
        ctx.fillText(onX && onY ? '+' : onX ? '|' : '-', x, y);
      }
    }
  }

  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(canvas);

  new ResizeObserver(resize).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    readColors();
    if (still) draw(0);
  });
  resize();

  if (still) return;
  function frame(t) {
    requestAnimationFrame(frame);
    if (visible) draw(t);
  }
  requestAnimationFrame(frame);
}
