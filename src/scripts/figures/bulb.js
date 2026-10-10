// 05 有所启发：灯泡。靠近时灯丝变红发亮，四周出现光芒，偶尔闪烁。
import { prism, circle, rect, draw, line, polyline, sphere, proj, SPHERE, spring, decay, clamp, demo } from './engine.js';

const plinth = prism(rect(-0.6, 0.6, -0.6, 0.6), -0.06, 0, (a, b, e) => [a, b, e]);
const up = (a, b, e) => [a, b, e];
const cap = prism(circle(0, 0, 0.25, 24), 0, 0.12, up);
const screw = prism(circle(0, 0, 0.2, 24), 0.12, 0.42, up);
const neck = prism(circle(0, 0, 0.15, 20), 0.42, 0.58, up);
const C = [0, 0, 1.0];
const RG = 0.46;
// 屏幕水平方向（x−y）上的单位向量，灯丝在这个竖直平面里，正对观者
const U = [Math.SQRT1_2, -Math.SQRT1_2, 0];
const at = (u, z) => [U[0] * u, U[1] * u, z];

function thread(z) {
  const out = [];
  for (let i = 0; i <= 12; i++) {
    const t = -Math.PI / 4 + (i / 12) * Math.PI;
    out.push([0.2 * Math.cos(t), 0.2 * Math.sin(t), z + 0.03 * (i / 12)]);
  }
  return out;
}

export const bulb = (intensity = 0.6) => {
  const rayLen = 0.25 + 0.3 * intensity;
  return {
    label: '一只灯泡，靠近时灯丝发红发亮',
    bounds: () => {
      // 光芒的屏幕半径；沿 U 每单位在屏幕上长 √1.5，竖直方向 1:1
      const r = RG * SPHERE * 1.18 + rayLen;
      return [...plinth.faces.flatMap((f) => f.v), at(r / SPHERE, C[2]), at(-r / SPHERE, C[2]), [0, 0, C[2] + r]];
    },
    init: () => ({ glow: 0, flick: 1 }),
    still(s) {
      s.glow = 0.7;
    },
    step(s, input) {
      let goal = input.pinned ? 1 : clamp(input.near * 1.2);
      if (input.idle) goal = demo(input.t, 7000, 0.5, 0.75) ? 0.9 : 0;
      const moving = spring(s, 'glow', goal, input.dt);
      // 亮着的时候偶尔闪一下：平均约两秒一次
      const target = s.glow > 0.3 && Math.random() < input.dt / 2000 ? 0.55 : 1;
      s.flick = target + decay(s.flick - target, input.dt, 60);
      return moving || s.glow > 0.05;
    },
    render(s) {
      const g = clamp(s.glow) * s.flick;
      let out = draw(plinth) + draw(cap) + draw(screw);
      for (const z of [0.17, 0.25, 0.33]) out += polyline(thread(z), 'mid');
      out += draw(neck);
      out += sphere(C, RG, `fo sil${g > 0.3 ? ' hi' : ''}`);
      // 支架、玻璃芯柱与灯丝
      out += line(at(0, 0.58), at(0, 0.78), 'lo');
      out += line(at(-0.06, 0.78), at(-0.13, 1.02), 'lo') + line(at(0.06, 0.78), at(0.13, 1.02), 'lo');
      out += line(at(-0.06, 0.78), at(0.06, 0.78), 'lo');
      const coil = [];
      for (let i = 0; i <= 28; i++) {
        const u = -0.13 + (0.26 * i) / 28;
        coil.push(at(u, 1.02 + 0.035 * Math.sin(i * 1.15)));
      }
      out += polyline(coil, g > 0.25 ? 'accent' : 'mid');
      if (g > 0.05) {
        const [cx, cy] = proj(C);
        const r0 = RG * SPHERE * 1.18;
        for (let i = 0; i < 12; i++) {
          const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
          if (Math.sin(a) > 0.55) continue; // 灯座方向不画
          const len = rayLen * g * (i % 2 ? 0.6 : 1);
          out += `<line class="accent" x1="${(cx + Math.cos(a) * r0).toFixed(2)}" y1="${(cy + Math.sin(a) * r0).toFixed(2)}" x2="${(cx + Math.cos(a) * (r0 + len)).toFixed(2)}" y2="${(cy + Math.sin(a) * (r0 + len)).toFixed(2)}"/>`;
        }
      }
      return out;
    },
  };
};
