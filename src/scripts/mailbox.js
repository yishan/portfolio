// 页脚的等距线稿信箱：指针靠近联系区时，前门绕底边打开，信件滑出，侧面红旗升起。
// 画法：每个部件是凸棱柱，面用纸色填充、按部件由后往前画；
// 只描轮廓线（可见面与不可见面之间）和折角大于 25° 的棱，曲面分段之间不描线。

const C30 = Math.cos(Math.PI / 6);
const VIEW = [1, 1, 1]; // 视线方向：x、y、z 越大越靠近观者
const CREASE = Math.cos((25 * Math.PI) / 180);

// 世界尺寸（x 为信箱长度方向，前门朝 +x）
const L = 2;
const W = 1;
const H0 = 0.55;
const R = W / 2;
const T = 0.05; // 门厚
const POST_Z = -1.35;

const proj = ([x, y, z]) => [(x - y) * C30, (x + y) * 0.5 - z];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const pts = (list) => list.map((p) => proj(p).map((n) => n.toFixed(2)).join(',')).join(' ');

// 拱形截面：下方直墙 + 上方半圆，(y, z) 平面
function archProfile(segments = 14) {
  const p = [[0, 0], [0, H0]];
  for (let i = 1; i < segments; i++) {
    const t = Math.PI - (i / segments) * Math.PI;
    p.push([R + R * Math.cos(t), H0 + R * Math.sin(t)]);
  }
  p.push([W, H0], [W, 0]);
  return p;
}
const ARCH = archProfile();
const rect = (a0, a1, b0, b1) => [[a0, b0], [a0, b1], [a1, b1], [a1, b0]];

// 把二维截面沿 e 方向拉伸成凸棱柱；toWorld(a, b, e) 给出世界坐标
function prism(profile, e0, e1, toWorld, cls = '') {
  const ring0 = profile.map(([a, b]) => toWorld(a, b, e0));
  const ring1 = profile.map(([a, b]) => toWorld(a, b, e1));
  const n = profile.length;
  const faces = [];
  faces.push({ v: [...ring0].reverse(), cap: 0 });
  faces.push({ v: ring1, cap: 1 });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push({ v: [ring0[i], ring0[j], ring1[j], ring1[i]], side: i });
  }
  const all = [...ring0, ...ring1];
  const c = all.reduce((s, p) => [s[0] + p[0] / all.length, s[1] + p[1] / all.length, s[2] + p[2] / all.length], [0, 0, 0]);
  for (const f of faces) {
    let nrm = norm(cross(sub(f.v[1], f.v[0]), sub(f.v[2], f.v[0])));
    const fc = f.v.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((x) => x / f.v.length);
    if (dot(nrm, sub(fc, c)) < 0) nrm = nrm.map((x) => -x);
    f.n = nrm;
    f.vis = dot(nrm, VIEW) > 1e-6;
  }
  // 棱：截面环上的棱（端面 × 侧面）+ 纵向棱（相邻侧面）
  const edges = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const side = faces[2 + i];
    edges.push([ring0[i], ring0[j], faces[0], side]);
    edges.push([ring1[i], ring1[j], faces[1], side]);
    edges.push([ring0[j], ring1[j], side, faces[2 + j]]);
  }
  return { faces, edges, cls, ring1 };
}

function drawPrism({ faces, edges, cls }, hi = false) {
  let out = '';
  for (const f of faces) if (f.vis) out += `<polygon class="fo ${cls}" points="${pts(f.v)}"/>`;
  for (const [a, b, fa, fb] of edges) {
    let k = null;
    if (fa.vis !== fb.vis) k = 'sil';
    else if (fa.vis && dot(fa.n, fb.n) < CREASE) k = 'mid';
    if (!k) continue;
    const [x1, y1] = proj(a);
    const [x2, y2] = proj(b);
    out += `<line class="${k}${hi ? ' hi' : ''} ${cls}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
  }
  return out;
}

// 部件
const ground = prism(rect(0.15, 1.85, -0.35, 1.35), POST_Z - 0.06, POST_Z, (a, b, e) => [a, b, e]);
const post = prism(rect(0.86, 1.14, 0.36, 0.64), POST_Z, 0, (a, b, e) => [a, b, e]);
const body = prism(ARCH, 0, L, (a, b, e) => [e, a, b]);

function door(phi) {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const at = (y, z, u) => [L + u * c + z * s, y, -u * s + z * c];
  const panel = prism(ARCH, 0, T, (a, b, e) => at(a, b, e), 'door');
  const top = H0 + R;
  const handle = prism(rect(0.42, 0.58, top - 0.16, top - 0.08), T, T + 0.07, (a, b, e) => at(a, b, e), 'door');
  return { panel, handle };
}

function flag(psi) {
  const px = 0.5;
  const pz = H0 * 0.55;
  const s = Math.sin(psi);
  const c = Math.cos(psi);
  const at = (a, p, e) => [px + a * c - p * s, e, pz + a * s + p * c];
  return {
    arm: prism(rect(-0.06, 0.72, -0.035, 0.035), W + 0.02, W + 0.05, at),
    plate: prism(rect(0.5, 0.78, 0.035, 0.24), W + 0.02, W + 0.05, at, 'flag'),
  };
}

function letter(x0, x1) {
  return prism(rect(x0, x1, 0.2, 0.8), 0.03, 0.06, (a, b, e) => [a, b, e], 'letter');
}

export function initMailbox(el, { trigger = el.parentElement, intensity = 0.6 } = {}) {
  if (!el) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', el.dataset.label || '一个信箱');
  const uid = `mb${Math.random().toString(36).slice(2, 7)}`;

  // 取开、合两种状态的投影外框作为 viewBox
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = (prisms) => {
    for (const p of prisms)
      for (const f of p.faces)
        for (const v of f.v) {
          const [x, y] = proj(v);
          bounds[0] = Math.min(bounds[0], x);
          bounds[1] = Math.min(bounds[1], y);
          bounds[2] = Math.max(bounds[2], x);
          bounds[3] = Math.max(bounds[3], y);
        }
  };
  const d0 = door(0);
  const d1 = door(Math.PI / 2);
  const f1 = flag(Math.PI / 2);
  grow([ground, post, body, d0.panel, d1.panel, d1.handle, f1.arm, f1.plate, letter(L - 0.95, L + 0.9)]);
  const pad = 0.12;
  svg.setAttribute(
    'viewBox',
    `${bounds[0] - pad} ${bounds[1] - pad} ${bounds[2] - bounds[0] + pad * 2} ${bounds[3] - bounds[1] + pad * 2}`,
  );
  el.appendChild(svg);

  const maxDoor = ((55 + 35 * intensity) * Math.PI) / 180;
  const maxSlide = 0.35 + 0.55 * intensity;

  // 前开口（门洞）与洞内的后壁、底棱：裁切在门洞内
  const front = ARCH.map(([y, z]) => [L, y, z]);
  const back = ARCH.map(([y, z]) => [0, y, z]);

  function render(open, flagUp) {
    const phi = open * maxDoor;
    const slide = Math.max(0, (open - 0.55) / 0.45) * maxSlide;
    const x0 = L - 0.95 + slide;
    const x1 = x0 + 0.9;
    const d = door(phi);
    const f = flag((flagUp * Math.PI) / 2);
    const active = open > 0.25;

    let out = drawPrism(ground) + drawPrism(post) + drawPrism(body);

    if (open > 0.02) {
      out += `<clipPath id="${uid}"><polygon points="${pts(front)}"/></clipPath><g clip-path="url(#${uid})">`;
      out += `<polygon class="fo" points="${pts(front)}"/>`;
      out += `<polyline class="lo nf" points="${pts(back)}"/>`;
      for (const [y, z] of [[0, 0], [W, 0], [0, H0], [W, H0]]) {
        const [ax, ay] = proj([0, y, z]);
        const [bx, by] = proj([L, y, z]);
        out += `<line class="lo" x1="${ax.toFixed(2)}" y1="${ay.toFixed(2)}" x2="${bx.toFixed(2)}" y2="${by.toFixed(2)}"/>`;
      }
      out += drawPrism(letter(x0, Math.min(x1, L)), active);
      out += '</g>';
    }

    // 门开过 45° 后把手翻到门板下面，先画把手
    if (phi > Math.PI / 4) out += drawPrism(d.handle, active) + drawPrism(d.panel, active);
    else out += drawPrism(d.panel, active) + drawPrism(d.handle, active);

    if (x1 > L + 0.01) {
      const outside = letter(Math.max(x0, L), x1);
      out += drawPrism(outside, true);
      // 信封封舌：信件顶面上的 V 字
      if (x1 - L > 0.3) {
        const z = 0.06;
        out += `<polyline class="hi nf" points="${pts([[x1, 0.2, z], [x1 - 0.26, 0.5, z], [x1, 0.8, z]])}"/>`;
      }
    }

    out += drawPrism(f.arm) + drawPrism(f.plate);
    svg.innerHTML = out;
  }

  // 弹簧：门偏稳，旗子带一点回弹
  let open = 0;
  let openV = 0;
  let flagUp = 0;
  let flagV = 0;
  let target = 0;
  let pinned = false;
  let lastPointer = -1e9;

  if (still) {
    render(0, 1);
    return;
  }
  render(0, 0);

  trigger.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const reach = Math.max(r.width * 1.6, 260);
    target = Math.min(1, Math.max(0, 1.25 - Math.hypot(dx, dy) / reach));
    lastPointer = performance.now();
  });
  trigger.addEventListener('pointerleave', () => {
    if (!pinned) target = 0;
  });
  el.addEventListener('click', () => {
    pinned = !pinned;
    target = pinned ? 1 : 0;
    lastPointer = performance.now();
  });

  let visible = false;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(el);

  function frame(t) {
    requestAnimationFrame(frame);
    if (!visible) return;

    // 无人操作时，每 8 秒自己开合一次
    let goal = target;
    if (!pinned && t - lastPointer > 5000) {
      const phase = (t % 8000) / 8000;
      goal = phase > 0.55 && phase < 0.85 ? 0.85 : 0;
    }

    openV = (openV + (goal - open) * 0.05) * 0.8;
    open += openV;
    const flagGoal = open > 0.5 ? 1 : 0;
    flagV = (flagV + (flagGoal - flagUp) * 0.06) * 0.86;
    flagUp += flagV;

    if (Math.abs(openV) > 1e-4 || Math.abs(flagV) > 1e-4 || Math.abs(goal - open) > 1e-3) {
      render(Math.max(0, Math.min(1, open)), Math.max(-0.1, Math.min(1.1, flagUp)));
    }
  }
  requestAnimationFrame(frame);
}
