// 等距线稿图形的通用引擎。
// 坐标：x 朝右下、y 朝左下、z 朝上；x+y+z 越大越靠近观者。
// 每个部件是凸棱柱：可见面用纸色填充，只描轮廓线（可见面与不可见面之间）和折角大于 25° 的棱。
// 部件之间靠画的先后来遮挡，由各图形自己安排顺序。

const C30 = Math.cos(Math.PI / 6);
const VIEW = [1, 1, 1];
const CREASE = Math.cos((25 * Math.PI) / 180);
// 本投影不缩短坐标轴，球体投影成半径 r·√1.5 的圆
export const SPHERE = Math.sqrt(1.5);

export const proj = ([x, y, z]) => [(x - y) * C30, (x + y) * 0.5 - z];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const f2 = (n) => n.toFixed(2);
export const pts = (list) => list.map((p) => proj(p).map(f2).join(',')).join(' ');

export const rect = (a0, a1, b0, b1) => [[a0, b0], [a0, b1], [a1, b1], [a1, b0]];
export function circle(cx, cy, r, n = 20) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return out;
}

// 二维截面沿 e 拉伸成凸棱柱。toWorld(a, b, e) → [x, y, z]。
// open0 / open1：该端面是切口（不画面、不画端面棱），用于把部件切成"露在外面的一段"。
export function prism(profile, e0, e1, toWorld, { cls = '', open0 = false, open1 = false } = {}) {
  const ring0 = profile.map(([a, b]) => toWorld(a, b, e0));
  const ring1 = profile.map(([a, b]) => toWorld(a, b, e1));
  const n = profile.length;
  const cap0 = { v: [...ring0].reverse(), open: open0 };
  const cap1 = { v: ring1, open: open1 };
  const sides = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sides.push({ v: [ring0[i], ring0[j], ring1[j], ring1[i]] });
  }
  const faces = [cap0, cap1, ...sides];
  const all = [...ring0, ...ring1];
  const c = all.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((x) => x / all.length);
  for (const f of faces) {
    let nrm = norm(cross(sub(f.v[1], f.v[0]), sub(f.v[2], f.v[0])));
    const fc = f.v.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((x) => x / f.v.length);
    if (dot(nrm, sub(fc, c)) < 0) nrm = nrm.map((x) => -x);
    f.n = nrm;
    f.vis = dot(nrm, VIEW) > 1e-6;
  }
  const edges = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (!open0) edges.push([ring0[i], ring0[j], cap0, sides[i]]);
    if (!open1) edges.push([ring1[i], ring1[j], cap1, sides[i]]);
    edges.push([ring0[j], ring1[j], sides[i], sides[j]]);
  }
  return { faces, edges, cls, ring0, ring1 };
}

export function line(a, b, cls = '') {
  const [x1, y1] = proj(a);
  const [x2, y2] = proj(b);
  return `<line class="${cls}" x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}"/>`;
}
export const polyline = (list, cls = '') => `<polyline class="nf ${cls}" points="${pts(list)}"/>`;
export const polygon = (list, cls = '') => `<polygon class="${cls}" points="${pts(list)}"/>`;
export function sphere(c, r, cls = '') {
  const [x, y] = proj(c);
  return `<circle class="${cls}" cx="${f2(x)}" cy="${f2(y)}" r="${f2(r * SPHERE)}"/>`;
}

// hi：整件用最深的墨色描边（表示正在被操作的部件）
export function draw(p, hi = false) {
  let out = '';
  for (const f of p.faces) if (f.vis && !f.open) out += `<polygon class="fo ${p.cls}" points="${pts(f.v)}"/>`;
  for (const [a, b, fa, fb] of p.edges) {
    const va = fa.vis && !fa.open;
    const vb = fb.vis && !fb.open;
    let k = null;
    if (fa.open || fb.open) k = va || vb ? 'sil' : null;
    else if (va !== vb) k = 'sil';
    else if (va && dot(fa.n, fb.n) < CREASE) k = 'mid';
    if (k) out += line(a, b, `${k}${hi ? ' hi' : ''} ${p.cls}`);
  }
  return out;
}

// 被同一形状遮住的区域：返回只在 shape 投影内显示内容的 <g>
export function clipped(id, shape, inner) {
  return `<clipPath id="${id}"><polygon points="${pts(shape)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}

// 阻尼弹簧：返回是否仍在运动
export function spring(s, key, goal, k = 0.06, damp = 0.82) {
  const v = `${key}V`;
  s[v] = ((s[v] ?? 0) + (goal - s[key]) * k) * damp;
  s[key] += s[v];
  return Math.abs(s[v]) > 1e-4 || Math.abs(goal - s[key]) > 1e-3;
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

let uidSeq = 0;

// 挂载一个图形。fig = { label, bounds() → 三维点数组, init() → state,
//   step(state, input) → 是否需要重绘, render(state, uid) → svg 字符串, still?(state) }
// input = { near: 0–1 指针接近度, sx, sy: 指针在投影坐标里的位置（无指针时为 null）,
//   idle: 久未操作, pinned: 点击锁定, t, dt }
export function mount(el, fig, { trigger = el.parentElement, reach = 1.6 } = {}) {
  if (!el) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', el.dataset.label || fig.label || '');
  const uid = `fg${++uidSeq}`;

  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of fig.bounds()) {
    const [x, y] = proj(p);
    b[0] = Math.min(b[0], x);
    b[1] = Math.min(b[1], y);
    b[2] = Math.max(b[2], x);
    b[3] = Math.max(b[3], y);
  }
  const pad = fig.pad ?? 0.12;
  const vb = [b[0] - pad, b[1] - pad, b[2] - b[0] + pad * 2, b[3] - b[1] + pad * 2];
  svg.setAttribute('viewBox', vb.map(f2).join(' '));
  el.style.aspectRatio = `${vb[2]} / ${vb[3]}`;
  el.appendChild(svg);

  const state = fig.init();
  if (still) {
    fig.still?.(state);
    svg.innerHTML = fig.render(state, uid);
    return;
  }
  svg.innerHTML = fig.render(state, uid);

  const input = { near: 0, sx: null, sy: null, idle: true, pinned: false, t: 0, dt: 16 };
  let lastPointer = -1e9;
  trigger.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const span = Math.max(r.width * reach, 240);
    input.near = clamp(1.25 - Math.hypot(dx, dy) / span);
    input.sx = vb[0] + ((e.clientX - r.left) / r.width) * vb[2];
    input.sy = vb[1] + ((e.clientY - r.top) / r.height) * vb[3];
    lastPointer = performance.now();
  });
  trigger.addEventListener('pointerleave', () => {
    input.near = 0;
    input.sx = input.sy = null;
  });
  el.addEventListener('click', () => {
    input.pinned = !input.pinned;
    lastPointer = performance.now();
  });

  let visible = false;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(el);

  let prev = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!visible) {
      prev = t;
      return;
    }
    input.dt = Math.min(64, t - prev || 16);
    prev = t;
    input.t = t;
    input.idle = !input.pinned && t - lastPointer > 5000;
    if (fig.step(state, input)) svg.innerHTML = fig.render(state, uid);
  }
  requestAnimationFrame(frame);
}

// 无人操作时的演示节奏：每 period 毫秒里有一段 [from, to) 处于"演示中"
export const demo = (t, period = 8000, from = 0.55, to = 0.85) => {
  const ph = (t % period) / period;
  return ph >= from && ph < to;
};
