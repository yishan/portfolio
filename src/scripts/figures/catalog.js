// 04 参考文本：图书馆卡片柜，两行三列抽屉。指针选中的抽屉拉出，露出一排索引卡，其中一张带红色标签。
import { prism, rect, draw, line, polyline, polygon, clipped, proj, spring, clamp } from './engine.js';

const FX = 1; // 柜子正面所在的 x
const CY = 1.5;
const CZ = 1.15;
const box = (x0, x1, y0, y1, z0, z1, opts) => prism(rect(x0, x1, y0, y1), z0, z1, (a, b, e) => [a, b, e], opts);

const cabinet = box(0, FX, 0, CY, 0, CZ);
const legs = [[0.06, 0.06], [0.06, CY - 0.12], [FX - 0.12, 0.06], [FX - 0.12, CY - 0.12]].map(([x, y]) =>
  box(x, x + 0.06, y, y + 0.06, -0.26, 0),
);
const plinth = box(-0.12, FX + 0.12, -0.12, CY + 0.12, -0.32, -0.26);

const DRAWERS = [];
for (let r = 0; r < 2; r++)
  for (let c = 0; c < 3; c++) {
    const y0 = 0.08 + c * 0.46;
    const z0 = 0.1 + r * 0.52;
    DRAWERS.push({ y0, y1: y0 + 0.4, z0, z1: z0 + 0.45 });
  }
const face = ({ y0, y1, z0, z1 }, x) => [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]];

function front(d, x, outline = true) {
  const ym = (d.y0 + d.y1) / 2;
  let out = outline ? polygon(face(d, x), 'nf mid') : '';
  out += polygon(face({ y0: ym - 0.09, y1: ym + 0.09, z0: d.z1 - 0.15, z1: d.z1 - 0.07 }, x), 'nf lo');
  out += draw(box(x, x + 0.05, ym - 0.03, ym + 0.03, d.z0 + 0.14, d.z0 + 0.2));
  return out;
}

// 拉出 dx 后露在柜外的那段抽屉
function drawerOut(d, dx, active, red) {
  const x1 = FX + dx;
  const fp = x1 - 0.04;
  const wall = d.z1 - 0.14;
  let out = draw(box(FX, fp, d.y0, d.y0 + 0.025, d.z0, wall, { open0: true }), active);
  out += draw(box(FX, fp, d.y0, d.y1, d.z0, d.z0 + 0.03, { open0: true }), active);
  for (let x = FX + 0.03; x < fp - 0.02; x += 0.055) {
    out += draw(box(x, x + 0.012, d.y0 + 0.04, d.y1 - 0.04, d.z0 + 0.03, d.z1 - 0.06), active);
    if (red && Math.abs(x - (FX + 0.03 + 0.055 * 2)) < 0.01)
      out += draw(box(x, x + 0.012, d.y0 + 0.08, d.y0 + 0.17, d.z1 - 0.06, d.z1 + 0.01, { cls: 'accent' }));
  }
  out += draw(box(FX, fp, d.y1 - 0.025, d.y1, d.z0, wall, { open0: true }), active);
  out += draw(box(fp, x1, d.y0 - 0.01, d.y1 + 0.01, d.z0 - 0.01, d.z1 + 0.01), active);
  return out + front(d, x1, false);
}

export const catalog = (intensity = 0.6) => {
  const maxOut = 0.4 + 0.35 * intensity;
  return {
    label: '一只卡片柜，指针选中的抽屉会拉出来，露出索引卡',
    bounds: () =>
      [plinth, cabinet, ...DRAWERS.map((d) => box(FX, FX + maxOut, d.y0, d.y1, d.z0, d.z1 + 0.02))].flatMap((p) =>
        p.faces.flatMap((f) => f.v),
      ),
    init: () => ({ out: DRAWERS.map(() => 0), sel: 4 }),
    step(s, input) {
      if (input.sx !== null && input.near > 0.15) {
        let best = Infinity;
        DRAWERS.forEach((d, i) => {
          const [x, y] = proj([FX + s.out[i] * maxOut, (d.y0 + d.y1) / 2, (d.z0 + d.z1) / 2]);
          const dist = Math.hypot(x - input.sx, y - input.sy);
          if (dist < best) {
            best = dist;
            s.sel = i;
          }
        });
      }
      let goal = input.pinned ? 1 : clamp(input.near * 1.3);
      if (input.idle) {
        s.sel = [4, 0, 5, 2, 3, 1][Math.floor(input.t / 2600) % 6];
        goal = 0.85;
      }
      let moving = false;
      DRAWERS.forEach((_, i) => {
        const tmp = { o: s.out[i], oV: s[`v${i}`] ?? 0 };
        moving = spring(tmp, 'o', i === s.sel ? goal : 0, input.dt) || moving;
        s.out[i] = tmp.o;
        s[`v${i}`] = tmp.oV;
      });
      return moving;
    },
    render(s, uid) {
      let out = draw(plinth);
      for (const l of legs) out += draw(l);
      out += draw(cabinet);
      const pulled = [];
      DRAWERS.forEach((d, i) => {
        const dx = clamp(s.out[i], 0, 1.1) * maxOut;
        if (dx < 0.01) {
          out += front(d, FX);
          return;
        }
        // 抽屉洞：洞内只看见上沿与侧壁往里的线
        const hole = face(d, FX);
        let inner = polygon(hole, 'fo');
        inner += line([FX, d.y0, d.z1], [FX - 0.5, d.y0, d.z1], 'lo') + line([FX, d.y0, d.z0], [FX - 0.5, d.y0, d.z0], 'lo');
        inner += polyline([[FX - 0.5, d.y0, d.z0], [FX - 0.5, d.y0, d.z1], [FX - 0.5, d.y1, d.z1]], 'lo');
        out += clipped(`${uid}-${i}`, hole, inner) + polygon(hole, 'nf mid');
        pulled.push([i, dx]);
      });
      // 拉出的抽屉：y、z 越大越靠近观者，后画
      pulled.sort(([a], [b]) => DRAWERS[a].y0 + DRAWERS[a].z0 - DRAWERS[b].y0 - DRAWERS[b].z0);
      for (const [i, dx] of pulled) out += drawerOut(DRAWERS[i], dx, s.out[i] > 0.3, i === s.sel);
      return out;
    },
  };
};
