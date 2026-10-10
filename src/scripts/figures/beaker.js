// 03 随手试验：烧杯。玻璃是透明的——杯壁之后画的线都透过玻璃可见。
// 靠近时红色液面上升、气泡加快，玻璃棒跟着慢慢搅动。
import { prism, circle, rect, draw, line, polyline, sphere, spring, clamp } from './engine.js';

const R = 0.55;
const H = 1.3;
const plinth = prism(rect(-0.85, 0.85, -0.85, 0.85), -0.06, 0, (a, b, e) => [a, b, e]);
const glass = prism(circle(0, 0, R, 32), 0, H, (a, b, e) => [a, b, e], { open1: true });
const ring = (r, z, a0 = 0, a1 = Math.PI * 2, n = 40) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    out.push([r * Math.cos(t), r * Math.sin(t), z]);
  }
  return out;
};
// 圆柱在本投影下的左右轮廓位于 135° 与 315°
const SIL = [(3 * Math.PI) / 4, (7 * Math.PI) / 4];
const FRONT = [-Math.PI / 4, (3 * Math.PI) / 4];

export const beaker = (intensity = 0.6) => {
  const rise = 0.3 + 0.35 * intensity;
  return {
    label: '一只烧杯，靠近时红色液面上升、气泡加快',
    pad: 0.15,
    bounds: () => [...plinth.faces.flatMap((f) => f.v), ...ring(R, H), ...ring(R, 0), [0.62, -0.62, H + 0.4], [-0.62, 0.62, H + 0.4]],
    init: () => ({
      level: 0,
      stir: 0,
      bubbles: Array.from({ length: 9 }, (_, i) => ({ a: i * 2.4, r: 0.15 + ((i * 37) % 30) / 100, z: (i * 0.13) % 0.5, s: 0.6 + ((i * 53) % 40) / 100 })),
    }),
    still(s) {
      s.level = 0.5;
    },
    step(s, input) {
      let goal = input.pinned ? 1 : input.near;
      if (input.idle) goal = 0.15;
      spring(s, 'level', goal, 0.04, 0.84);
      const h = 0.45 + clamp(s.level, 0, 1.1) * rise;
      const speed = (0.12 + clamp(s.level) * 0.6) * (input.dt / 1000);
      s.stir += speed * 1.2;
      for (const b of s.bubbles) {
        b.z += speed * b.s;
        if (b.z > h - 0.04) {
          b.z = 0.04;
          b.a += 1.7;
        }
      }
      return true;
    },
    render(s) {
      const h = 0.45 + clamp(s.level, 0, 1.1) * rise;
      let out = draw(plinth) + draw(glass);
      // 刻度：杯壁正面的短弧
      for (const z of [0.35, 0.6, 0.85, 1.1]) out += polyline(ring(R + 0.005, z, Math.PI / 8, Math.PI / 4.2, 6), 'mid');
      // 液体：轮廓竖线 + 前半圈底边 + 液面
      for (const t of SIL) out += line([R * 0.96 * Math.cos(t), R * 0.96 * Math.sin(t), 0.03], [R * 0.96 * Math.cos(t), R * 0.96 * Math.sin(t), h], 'lo');
      out += polyline(ring(R * 0.96, 0.03, ...FRONT), 'lo');
      out += polyline(ring(R * 0.96, h), 'accent');
      for (const b of s.bubbles) {
        if (b.z > h - 0.04) continue;
        out += sphere([b.r * Math.cos(b.a), b.r * Math.sin(b.a), b.z], 0.025 + 0.015 * b.s, 'nf accent');
      }
      // 玻璃棒：杯内段透过玻璃（淡），杯口以上为实线
      const foot = [0.22 * Math.cos(s.stir), 0.22 * Math.sin(s.stir), 0.05];
      const tip = [-0.42 * Math.cos(s.stir * 0.3 + 0.8), 0.42 * Math.sin(s.stir * 0.3 + 0.8), H + 0.35];
      const k = (H - foot[2]) / (tip[2] - foot[2]);
      const rim = foot.map((v, i) => v + (tip[i] - v) * k);
      out += line(foot, rim, 'lo') + line(rim, tip, 'hi');
      // 杯口：后半圈淡、前半圈为轮廓
      out += polyline(ring(R, H, FRONT[1], FRONT[0] + Math.PI * 2), 'mid');
      out += polyline(ring(R, H, ...FRONT), 'sil');
      return out;
    },
  };
};
