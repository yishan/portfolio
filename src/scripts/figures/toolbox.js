// 02 兴趣项目：工具箱，滑盖式。靠近时盖子沿长边往后滑开，透过开口看见托盘上的红柄螺丝刀和直尺。
// 盖子只做水平滑动，图形高度不随打开而增加。
import { prism, rect, circle, draw, line, polygon, polyline, clipped, spring, clamp, demo } from './engine.js';

const LX = 1.7;
const LY = 0.85;
const LZ = 0.6;
const LID = 0.07;
const box = (x0, x1, y0, y1, z0, z1, opts) => prism(rect(x0, x1, y0, y1), z0, z1, (a, b, e) => [a, b, e], opts);

const plinth = box(-0.15, LX + 0.15, -0.15, LY + 0.15, -0.06, 0);
const body = box(0, LX, 0, LY, 0, LZ);
const latch = box(LX, LX + 0.04, 0.36, 0.49, LZ - 0.16, LZ - 0.04);
const top = [[0, 0, LZ], [LX, 0, LZ], [LX, LY, LZ], [0, LY, LZ]];

// 盖子沿 −x 滑出 d；把手是盖面上一根横条
const lid = (d) => ({
  plate: box(-d, LX - d, -0.02, LY + 0.02, LZ, LZ + LID),
  grip: box(LX - d - 0.3, LX - d - 0.12, 0.3, LY - 0.3, LZ + LID, LZ + LID + 0.05),
});

// 托盘与工具都在箱口以下，只透过开口看见
const TRAY_Z = LZ - 0.32;
const tray = box(0.08, LX - 0.08, 0.07, LY - 0.07, TRAY_Z, TRAY_Z + 0.12);
function tools() {
  const z = TRAY_Z + 0.12;
  const along = (y, zc) => (a, b, e) => [e, y + a, zc + b];
  return [
    prism(circle(0, 0, 0.065, 14), 0.25, 0.66, along(0.24, z + 0.065), { cls: 'accent' }),
    prism(circle(0, 0, 0.02, 10), 0.66, 1.3, along(0.24, z + 0.065)),
    box(0.3, 1.45, 0.5, 0.64, z, z + 0.025),
  ];
}
function rulerTicks() {
  const z = TRAY_Z + 0.12 + 0.025;
  let out = '';
  for (let i = 0; i < 12; i++) {
    const x = 0.38 + i * 0.09;
    out += line([x, 0.5, z], [x, 0.5 + (i % 3 === 0 ? 0.07 : 0.04), z], 'lo');
  }
  return out;
}

export const toolbox = (intensity = 0.6) => {
  const maxSlide = LX * (0.45 + 0.25 * intensity);
  return {
    label: '一只滑盖工具箱，靠近时盖子滑开，露出里面的工具',
    bounds: () =>
      [plinth, body, latch, lid(0).plate, lid(0).grip, lid(maxSlide).plate].flatMap((p) => p.faces.flatMap((f) => f.v)),
    init: () => ({ open: 0 }),
    step(s, input) {
      let goal = input.pinned ? 1 : input.near;
      if (input.idle) goal = demo(input.t, 8000, 0.15, 0.45) ? 0.9 : 0;
      return spring(s, 'open', goal, input.dt);
    },
    render(s, uid) {
      const open = clamp(s.open);
      const d = open * maxSlide;
      const active = open > 0.25;
      let out = draw(plinth) + draw(body) + draw(latch);
      if (d > 0.01) {
        // 箱口内：内壁与底，托盘和工具
        let inner = polygon(top, 'fo');
        inner += polyline([[0, LY, 0.1], [0, 0, 0.1], [LX, 0, 0.1]], 'lo');
        inner += line([0, 0, 0.1], [0, 0, LZ], 'lo');
        inner += draw(tray) + tools().map((p) => draw(p, active)).join('') + rulerTicks();
        out += clipped(uid, top, inner);
      }
      // 盖子在箱口之上，永远在最前面
      const l = lid(d);
      return out + draw(l.plate, active) + draw(l.grip, active);
    },
  };
};
