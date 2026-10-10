// 02 兴趣项目：工具箱。靠近时箱盖向后掀开，托盘连同工具升出箱口。
import { prism, rect, circle, draw, line, polygon, polyline, clipped, spring, smooth, clamp, demo } from './engine.js';

const LX = 1.7;
const LY = 0.85;
const LZ = 0.6;
const LID = 0.07;
const box = (x0, x1, y0, y1, z0, z1, opts) => prism(rect(x0, x1, y0, y1), z0, z1, (a, b, e) => [a, b, e], opts);

const plinth = box(-0.15, LX + 0.15, -0.15, LY + 0.15, -0.06, 0);
const body = box(0, LX, 0, LY, 0, LZ);
const latch = box(LX, LX + 0.04, 0.36, 0.49, LZ - 0.16, LZ - 0.04);
const top = [[0, 0, LZ], [LX, 0, LZ], [LX, LY, LZ], [0, LY, LZ]];

function lid(theta) {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  // u 沿 x 从铰链（后缘 x=0）往前，w 为厚度方向
  const at = (u, w, y) => [u * c - w * s, y, LZ + u * s + w * c];
  return {
    plate: prism(rect(0, LX, 0, LID), 0, LY, at),
    handle: prism(rect(0.62, 1.08, LID, LID + 0.06), 0.38, 0.47, at),
  };
}

// 托盘与工具：zt 为托盘底面高度
const TRAY_H = 0.16;
const tray = (z0, z1, opts) => box(0.08, LX - 0.08, 0.07, LY - 0.07, z0, z1, opts);
function tools(zt) {
  const z = zt + TRAY_H;
  const along = (y, zc) => (a, b, e) => [e, y + a, zc + b];
  return [
    // 螺丝刀：红色手柄 + 细杆
    prism(circle(0, 0, 0.065, 14), 0.25, 0.66, along(0.24, z + 0.065), { cls: 'accent' }),
    prism(circle(0, 0, 0.02, 10), 0.66, 1.3, along(0.24, z + 0.065)),
    // 直尺
    box(0.3, 1.45, 0.5, 0.64, z, z + 0.025),
  ];
}
const rulerTicks = (zt) => {
  const z = zt + TRAY_H + 0.025;
  let out = '';
  for (let x = 0.38; x < 1.42; x += 0.09) out += line([x, 0.5, z], [x, 0.5 + (Math.round(x * 100) % 18 === 0 ? 0.07 : 0.04), z], 'lo');
  return out;
};

export const toolbox = (intensity = 0.6) => {
  const maxLid = ((95 + 20 * intensity) * Math.PI) / 180;
  const lift = 0.35 + 0.2 * intensity;
  const restZ = 0.3;
  return {
    label: '一只工具箱，靠近时箱盖掀开、托盘带着工具升起',
    bounds() {
      const l = lid(maxLid);
      const zt = restZ + lift;
      return [plinth, body, l.plate, l.handle, tray(zt, zt + TRAY_H), ...tools(zt), lid(0).handle].flatMap((p) => p.faces.flatMap((f) => f.v));
    },
    init: () => ({ open: 0 }),
    step(s, input) {
      let goal = input.pinned ? 1 : input.near;
      if (input.idle) goal = demo(input.t, 8000, 0.15, 0.45) ? 0.9 : 0;
      return spring(s, 'open', goal, input.dt);
    },
    render(s, uid) {
      const open = clamp(s.open);
      const theta = open * maxLid;
      const zt = restZ + smooth(0.45, 1, open) * lift;
      const l = lid(theta);
      const active = open > 0.25;
      const lidOut = theta > Math.PI / 2;
      const drawLid = () =>
        lidOut ? draw(l.handle, active) + draw(l.plate, active) : draw(l.plate, active) + draw(l.handle, active);

      let out = draw(plinth);
      if (lidOut) out += drawLid();
      out += draw(body) + draw(latch);

      if (open > 0.02) {
        // 箱口内：内壁与底，以及还在箱里的托盘部分
        let inner = polygon(top, 'fo');
        inner += polyline([[0, LY, 0.1], [0, 0, 0.1], [LX, 0, 0.1]], 'lo');
        inner += line([0, 0, 0.1], [0, 0, LZ], 'lo');
        inner += draw(tray(zt, Math.min(zt + TRAY_H, LZ), { open1: zt + TRAY_H > LZ }));
        if (zt + TRAY_H <= LZ) inner += tools(zt).map((p) => draw(p)).join('') + rulerTicks(zt);
        out += clipped(uid, top, inner);
        if (zt + TRAY_H > LZ) {
          // 托盘露出箱口的那一段，下端是切口
          out += draw(tray(Math.max(zt, LZ), zt + TRAY_H, { open0: zt < LZ }), active);
          out += tools(zt).map((p) => draw(p, active)).join('') + rulerTicks(zt);
        }
      }
      if (!lidOut) out += drawLid();
      return out;
    },
  };
};
