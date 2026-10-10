// 封面背景：很淡的 ASCII 字符雨，字符随机闪变；鼠标附近像手电筒一样照亮一圈隐藏的字符。
// 约 30 帧，封面不在视口时暂停；减弱动态时只画一帧静止的稀疏字符。

const CHARS = '01<>/\\|=+-*#%$@&{}[]()~^;:.,abcdefxyz';
const CELL_W = 11;
const CELL_H = 18;
const RADIUS = 170; // 光效半径（px）
const FRAME = 1000 / 30;

const pick = () => CHARS[Math.floor(Math.random() * CHARS.length)];

export function initMatrixField(canvas, area = canvas.parentElement) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0;
  let h = 0;
  let cols = 0;
  let rows = 0;
  let grid = []; // 每格一个字符，随机闪变
  let drops = []; // 每列一滴：{ y: 当前行（浮点）, speed: 行/秒, len: 拖尾长度 }
  let ink = '#1a1917';
  let accent = '#c63c26';

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    ink = s.getPropertyValue('--ink').trim() || ink;
    accent = s.getPropertyValue('--vermillion').trim() || accent;
  }

  const newDrop = (startAbove) => ({
    y: startAbove ? -Math.random() * rows : Math.random() * rows,
    speed: 2 + Math.random() * 4,
    len: 8 + Math.floor(Math.random() * 14),
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / CELL_W);
    rows = Math.ceil(h / CELL_H);
    grid = Array.from({ length: cols * rows }, pick);
    // 只有约一半的列在下雨，保持稀疏
    drops = Array.from({ length: cols }, () => (Math.random() < 0.5 ? newDrop(false) : null));
    readColors();
    if (still) drawStill();
  }

  // 指针（相对画布），离开后光效淡出
  let px = -1e4;
  let py = -1e4;
  let glow = 0;
  let glowGoal = 0;
  area.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
    glowGoal = 1;
  });
  area.addEventListener('pointerleave', () => {
    glowGoal = 0;
  });

  // 中央渐隐：越靠近大字越淡，保证 YISHAN 清楚
  const centerFade = (x, y) => {
    const dx = (x - w / 2) / (w * 0.42);
    const dy = (y - h / 2) / (h * 0.32);
    return Math.min(1, 0.3 + 0.7 * Math.min(1, Math.hypot(dx, dy)));
  };

  function cell(c, r, alpha, color = ink) {
    if (alpha < 0.01) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(grid[r * cols + c], c * CELL_W, r * CELL_H);
  }

  function frame(dt) {
    // 字符闪变：每帧随机换掉约 1% 的格子
    for (let i = 0, n = Math.ceil(grid.length * 0.01); i < n; i++) grid[Math.floor(Math.random() * grid.length)] = pick();
    glow += (glowGoal - glow) * Math.min(1, dt / 220);

    ctx.clearRect(0, 0, w, h);
    ctx.font = `12px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = 'top';

    // 字符雨
    for (let c = 0; c < cols; c++) {
      const d = drops[c];
      if (!d) {
        if (Math.random() < 0.002) drops[c] = newDrop(true);
        continue;
      }
      d.y += (d.speed * dt) / 1000;
      const head = Math.floor(d.y);
      for (let k = 0; k < d.len; k++) {
        const r = head - k;
        if (r < 0 || r >= rows) continue;
        const a = (k === 0 ? 0.16 : 0.1 * (1 - k / d.len)) * centerFade(c * CELL_W, r * CELL_H);
        cell(c, r, a);
      }
      if (head - d.len > rows) drops[c] = Math.random() < 0.6 ? newDrop(true) : null;
    }

    // 鼠标光效：照亮半径内的隐藏字符
    if (glow > 0.01) {
      const c0 = Math.max(0, Math.floor((px - RADIUS) / CELL_W));
      const c1 = Math.min(cols - 1, Math.ceil((px + RADIUS) / CELL_W));
      const r0 = Math.max(0, Math.floor((py - RADIUS) / CELL_H));
      const r1 = Math.min(rows - 1, Math.ceil((py + RADIUS) / CELL_H));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const dist = Math.hypot(c * CELL_W + CELL_W / 2 - px, r * CELL_H + CELL_H / 2 - py);
          if (dist > RADIUS) continue;
          const k = 1 - dist / RADIUS;
          const a = k * k * 0.45 * glow * centerFade(c * CELL_W, r * CELL_H);
          cell(c, r, a, dist < RADIUS * 0.18 && (r + c) % 3 === 0 ? accent : ink);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawStill() {
    ctx.clearRect(0, 0, w, h);
    ctx.font = `12px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = 'top';
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) if ((r * 7 + c * 13) % 11 === 0) cell(c, r, 0.06 * centerFade(c * CELL_W, r * CELL_H));
    ctx.globalAlpha = 1;
  }

  // 主题：跟随系统，也跟随访客手动切换（html[data-theme]）
  const recolor = () => {
    readColors();
    if (still) drawStill();
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  new ResizeObserver(resize).observe(canvas);
  resize();
  if (still) return;

  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(canvas);

  let last = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    if (!visible || t - last < FRAME) return;
    const dt = Math.min(100, t - last || FRAME);
    last = t;
    frame(dt);
  }
  requestAnimationFrame(loop);
}
