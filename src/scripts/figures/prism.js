// 灵光：三棱镜分光。一束光从左射入，在棱镜里折射两次，从右侧散成五条光线（一条朱红）。
// 光路按斯涅尔定律计算，每条光用略有不同的折射率模拟色散。
// 指针上下移动改变入射角；无人操作时入射角缓慢来回摆动。
import { prism as extrude, rect, draw, line, spring, clamp } from './engine.js';

// 截面放在世界 x–z 平面里（光沿 x 走，在屏幕上朝右下），沿 y 拉出纵深，与其他图形同一等距视角
const at = (u, z, v = 0) => [u, v, z];

// 截面（u, z）：底宽 W 的正三角形，立在 z = 0
const W = 1.2;
const H = (W * Math.sqrt(3)) / 2;
const D = 0.7; // 纵深
const TRI = [[-W / 2, 0], [0, H], [W / 2, 0]];
const body = extrude(TRI, -D / 2, D / 2, (a, b, e) => at(a, b, e));
const plinth = extrude(rect(-0.95, 0.95, -0.6, 0.6), -0.06, 0, (a, b, e) => [a, b, e]);

// 两个斜面：外法线与面上一点
const norm2 = ([a, b]) => {
  const l = Math.hypot(a, b);
  return [a / l, b / l];
};
const NL = norm2([-H, W / 2]);
const NR = norm2([H, W / 2]);
const PL = [-W / 2, 0];
const PR = [W / 2, 0];

// 入射点固定在左斜面 45% 高处
const F = 0.45;
const E = [-W / 2 + (W / 2) * F, H * F];

// 折射：d 为单位方向，n 为指向入射一侧的单位法线，eta = n1 / n2；全反射时返回 null
function refract(d, n, eta) {
  const cosi = -(d[0] * n[0] + d[1] * n[1]);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;
  const f = eta * cosi - Math.sqrt(k);
  return norm2([eta * d[0] + f * n[0], eta * d[1] + f * n[1]]);
}
// 从 p 沿 d 与过 q、法线为 n 的直线相交
function hit(p, d, q, n) {
  const den = d[0] * n[0] + d[1] * n[1];
  const t = ((q[0] - p[0]) * n[0] + (q[1] - p[1]) * n[1]) / den;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
}

// 五条色光：折射率由小到大（红光偏折最少），色散刻意放大以便看清
const RAYS = [
  { n: 1.44, cls: 'accent' },
  { n: 1.5, cls: 'hi' },
  { n: 1.56, cls: 'sil' },
  { n: 1.62, cls: 'mid' },
  { n: 1.68, cls: 'lo' },
];
const IN_LEN = 1.5;
const OUT_LEN = 1.7;

// 给定入射角（弧度，正值表示光线向上射入），算出入射段、棱镜内各段与出射段
function trace(alpha) {
  const d0 = [Math.cos(alpha), Math.sin(alpha)];
  const src = [E[0] - d0[0] * IN_LEN, E[1] - d0[1] * IN_LEN];
  const paths = RAYS.map(({ n, cls }) => {
    const d1 = refract(d0, NL, 1 / n);
    if (!d1) return null;
    const x = hit(E, d1, PR, NR);
    if (x[1] < 0 || x[1] > H) return null; // 没打到右斜面
    const d2 = refract(d1, [-NR[0], -NR[1]], n);
    if (!d2) return null;
    return { cls, x, end: [x[0] + d2[0] * OUT_LEN, x[1] + d2[1] * OUT_LEN] };
  });
  return { src, paths };
}

const A_MIN = (-6 * Math.PI) / 180;
const A_MAX = (22 * Math.PI) / 180;
const A_REST = (8 * Math.PI) / 180;

export const prism = () => ({
  label: '一块三棱镜：一束光从左边射入，在右边散成扇形光线',
  pad: 0.1,
  bounds() {
    const pts = [...plinth.faces.flatMap((f) => f.v), ...body.faces.flatMap((f) => f.v)];
    for (const a of [A_MIN, A_REST, A_MAX]) {
      const { src, paths } = trace(a);
      pts.push(at(...src));
      for (const p of paths) if (p) pts.push(at(...p.end));
    }
    return pts;
  },
  init: () => ({ alpha: A_REST, glow: 0 }),
  still(s) {
    s.glow = 1;
  },
  step(s, input) {
    let goal = A_REST;
    if (input.sx !== null && input.near > 0.1) {
      // 指针在入射点上方时光线向下射入、下方时向上，像手里握着光源。
      // 平面 y = 0 上的点 (u, z) 在屏幕上的 y 为 0.5u − z
      goal = clamp(A_REST + (input.sy - (0.5 * E[0] - E[1])) * 0.35, A_MIN, A_MAX);
    } else if (input.idle) {
      goal = A_REST + Math.sin(input.t / 2600) * ((A_MAX - A_MIN) / 3);
    }
    const a = spring(s, 'alpha', goal, input.dt);
    const b = spring(s, 'glow', input.near > 0.1 || input.pinned ? 1 : 0.55, input.dt);
    return a || b || input.idle;
  },
  render(s) {
    const { src, paths } = trace(s.alpha);
    const hi = s.glow > 0.8;
    let out = draw(plinth) + draw(body, hi);
    // 玻璃是透明的：光线直接画在棱镜之上，棱镜内的一段用淡线
    out += line(at(...src), at(...E), 'hi');
    for (const p of paths) if (p) out += line(at(...E), at(...p.x), 'lo');
    for (const p of paths) if (p) out += line(at(...p.x), at(...p.end), p.cls);
    return out;
  },
});
