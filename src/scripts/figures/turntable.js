// 在听：一台唱机。靠近时唱臂慢慢落到唱片外圈，唱片开始转；离开后唱臂抬回、唱片慢慢停下。
import { prism, circle, rect, draw, line, polyline, polygon, sphere, spring, decay, demo } from './engine.js';

const TOP = 0.22; // 底座顶面
const CX = -0.15; // 唱盘中心
const R = 0.6; // 唱片半径
const ZR = TOP + 0.08; // 唱片表面
const PIVOT = [0.74, -0.56];
const ARM = 0.92;
const REST = Math.PI / 2; // 唱臂收在底座右侧
const PLAY = (118 * Math.PI) / 180; // 唱针落在外圈
const SPIN = 0.9; // 转速，弧度/秒；故意比真唱机慢

const base = prism(rect(-0.95, 1, -0.82, 0.82), 0, TOP, (a, b, e) => [a, b, e]);
const platter = prism(circle(CX, 0, R + 0.04, 40), TOP, TOP + 0.06, (a, b, e) => [a, b, e]);
const record = prism(circle(CX, 0, R, 40), TOP + 0.06, ZR, (a, b, e) => [a, b, e]);
const post = prism(circle(PIVOT[0], PIVOT[1], 0.08, 16), TOP, TOP + 0.16, (a, b, e) => [a, b, e]);

const ring = (r, z, n = 40) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push([CX + r * Math.cos(t), r * Math.sin(t), z]);
  }
  return out;
};
const label = ring(0.17, ZR + 0.001, 24).slice(0, -1);

export const turntable = () => ({
  label: '一台唱机，靠近时唱臂落下、唱片慢慢转起来',
  pad: 0.1,
  bounds: () => [...base.faces.flatMap((f) => f.v), [PIVOT[0], PIVOT[1], TOP + 0.4], [PIVOT[0] - 0.3, PIVOT[1] - 0.3, TOP + 0.3]],
  init: () => ({ arm: 0, speed: 0, a: 0 }),
  still(s) {
    s.arm = 1;
  },
  step(s, input) {
    let goal = input.pinned || input.near > 0.35 ? 1 : 0;
    if (input.idle) goal = demo(input.t, 16000, 0.4, 0.72) ? 1 : 0;
    const moving = spring(s, 'arm', goal, input.dt, { k: 30, c: 11 });
    // 唱针落定后才开始转；抬起后按时间慢慢停下
    const target = s.arm > 0.92 ? SPIN : 0;
    s.speed = target + decay(s.speed - target, input.dt, 900);
    s.a += (s.speed * input.dt) / 1000;
    return moving || s.speed > 0.002;
  },
  render(s) {
    let out = draw(base) + draw(platter) + draw(record);
    for (const r of [0.26, 0.34, 0.42, 0.5, 0.56]) out += polyline(ring(r, ZR + 0.001), 'lo');
    out += polygon(label, 'fo accent');
    // 转动的标记：唱片上一道反光
    const c = Math.cos(s.a);
    const n = Math.sin(s.a);
    out += line([CX + 0.3 * c, 0.3 * n, ZR + 0.002], [CX + 0.55 * c, 0.55 * n, ZR + 0.002], 'mid');
    out += sphere([CX, 0, ZR + 0.03], 0.018, 'hi');
    // 唱臂：立柱、臂杆、配重、唱头
    const phi = REST + (PLAY - REST) * Math.min(1, Math.max(0, s.arm));
    const lift = 0.12 * (1 - Math.min(1, s.arm));
    const top = [PIVOT[0], PIVOT[1], TOP + 0.2];
    const d = [Math.cos(phi), Math.sin(phi)];
    const head = [PIVOT[0] + ARM * d[0], PIVOT[1] + ARM * d[1], ZR + 0.04 + lift];
    const back = [PIVOT[0] - 0.22 * d[0], PIVOT[1] - 0.22 * d[1], TOP + 0.21];
    out += draw(post);
    out += line(back, top, 'sil') + sphere(back, 0.05);
    out += line(top, head, 'hi');
    const side = [-d[1] * 0.07, d[0] * 0.07];
    out += line([head[0] - side[0], head[1] - side[1], head[2]], [head[0] + side[0], head[1] + side[1], head[2]], 'hi');
    out += sphere(top, 0.035);
    return out;
  },
});
